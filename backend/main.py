import json
import re
from collections import Counter
from contextlib import asynccontextmanager
from pathlib import Path

from google import genai
from fastapi import FastAPI, Request
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sse_starlette.sse import EventSourceResponse

from chat import ConversationManager
from config import settings
from dream_engine import DreamEngine
from memory_store import MemoryStore
from models import ChatRequest, DreamRequest
from seed_data import seed_memory_store


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.client = genai.Client(api_key=settings.gemini_api_key)
    app.state.memory = MemoryStore(settings.chroma_persist_dir)
    if app.state.memory.conversation_count() == 0:
        count = seed_memory_store(app.state.memory)
        print(f"Seeded {count} knowledge fragments into memory")
    app.state.chat_manager = ConversationManager(
        app.state.client, app.state.memory, settings
    )
    app.state.dream_engine = DreamEngine(
        app.state.client, app.state.memory, settings
    )
    yield


app = FastAPI(title="DreamAI", lifespan=lifespan)

frontend_dir = Path(__file__).parent.parent / "frontend"


@app.get("/")
async def root():
    return FileResponse(frontend_dir / "index.html")


app.mount("/static", StaticFiles(directory=str(frontend_dir)), name="static")


@app.post("/api/chat")
async def chat(request: Request, body: ChatRequest):
    chat_manager: ConversationManager = request.app.state.chat_manager

    async def event_stream():
        async for event in chat_manager.stream_response(
            body.conversation_id, body.message
        ):
            yield event

    return EventSourceResponse(event_stream())


@app.post("/api/dream")
async def dream(request: Request, body: DreamRequest = None):
    dream_engine: DreamEngine = request.app.state.dream_engine
    seed = body.seed_text if body else None

    async def event_stream():
        async for event in dream_engine.dream(seed_text=seed):
            yield event

    return EventSourceResponse(event_stream())


@app.get("/api/dreams")
async def get_dreams(request: Request, limit: int = 50, offset: int = 0):
    memory: MemoryStore = request.app.state.memory
    dreams = memory.get_all_dreams(limit=limit, offset=offset)
    return [d.model_dump(mode="json") for d in dreams]


@app.get("/api/conversations")
async def get_conversations(request: Request):
    memory: MemoryStore = request.app.state.memory
    convos = memory.get_all_conversations()
    return [c.model_dump(mode="json") for c in convos]


@app.get("/api/conversations/{conversation_id}")
async def get_conversation(request: Request, conversation_id: str):
    memory: MemoryStore = request.app.state.memory
    history = memory.get_conversation_history(conversation_id)
    return history


@app.get("/api/insights")
async def get_insights(request: Request):
    memory: MemoryStore = request.app.state.memory
    insights = memory.get_all_insights()
    return [i.model_dump(mode="json") for i in insights]


@app.get("/api/mind-map")
async def get_mind_map(request: Request):
    memory: MemoryStore = request.app.state.memory
    data = memory.get_mind_map_data()
    return data.model_dump(mode="json")


STOP_WORDS = {
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "shall", "can", "need", "dare", "ought",
    "used", "to", "of", "in", "for", "on", "with", "at", "by", "from",
    "as", "into", "through", "during", "before", "after", "above", "below",
    "between", "out", "off", "over", "under", "again", "further", "then",
    "once", "that", "this", "these", "those", "it", "its", "and", "but",
    "or", "nor", "not", "so", "very", "just", "about", "up", "than",
    "too", "each", "every", "all", "both", "few", "more", "most", "other",
    "some", "such", "no", "only", "own", "same", "also", "how", "what",
    "which", "who", "whom", "when", "where", "why", "there", "here",
    "they", "them", "their", "we", "our", "you", "your", "he", "she",
    "him", "her", "his", "my", "me", "i", "if", "because", "while",
    "even", "any", "many", "much", "one", "two", "like", "make", "new",
}


@app.get("/api/analytics")
async def get_analytics(request: Request):
    memory: MemoryStore = request.app.state.memory
    dreams = memory.get_all_dreams()
    conversations = memory.get_all_conversations()
    all_insights = memory.get_all_insights()

    # Word frequency heat map data
    word_counter = Counter()
    for dream in dreams:
        text = dream.raw_dream_output.lower()
        words = re.findall(r"[a-z]{4,}", text)
        for w in words:
            if w not in STOP_WORDS:
                word_counter[w] += 1
    # If no dreams yet, use seed conversation text
    if not word_counter:
        all_convos = memory.conversations.get(include=["documents"])
        if all_convos["documents"]:
            for doc in all_convos["documents"]:
                words = re.findall(r"[a-z]{4,}", doc.lower())
                for w in words:
                    if w not in STOP_WORDS:
                        word_counter[w] += 1

    heat_map_words = [
        {"word": w, "count": c}
        for w, c in word_counter.most_common(80)
    ]

    # Radar/spider chart — dream dimensions
    radar_data = {"labels": [], "values": []}
    if dreams:
        avg_creativity = sum(d.creativity_score for d in dreams) / len(dreams)
        avg_insights = sum(len(d.insights) for d in dreams) / len(dreams)
        avg_questions = sum(len(d.questions_raised) for d in dreams) / len(dreams)
        avg_themes = sum(len(d.themes) for d in dreams) / len(dreams)
        avg_fragments = sum(len(d.memory_fragments_used) for d in dreams) / len(dreams)
        radar_data = {
            "labels": ["Creativity", "Insights", "Questions", "Themes", "Memory Depth"],
            "values": [
                min(avg_creativity, 1.0),
                min(avg_insights / 4, 1.0),
                min(avg_questions / 3, 1.0),
                min(avg_themes / 5, 1.0),
                min(avg_fragments / 10, 1.0),
            ],
        }

    # Sankey flow — memories → dreams → insights
    TOPIC_LABELS = {
        "science_cosmos": "Cosmos",
        "science_life": "Biology",
        "philosophy_ancient": "Ancient Phil.",
        "philosophy_modern": "Modern Phil.",
        "art_music": "Art & Music",
        "nature_phenomena": "Nature",
        "technology_ai": "Technology",
        "connections_crossdomain": "Connections",
        "psychology_mind": "Psychology",
        "linguistics_language": "Linguistics",
        "mathematics_patterns": "Mathematics",
        "ecology_systems": "Ecology",
        "consciousness_mystery": "Consciousness",
    }
    sankey_nodes = []
    sankey_links = []
    conv_map = {}
    for c in conversations:
        node_id = len(sankey_nodes)
        conv_map[c.conversation_id] = node_id
        label = TOPIC_LABELS.get(c.conversation_id, c.title[:20])
        sankey_nodes.append({
            "id": node_id,
            "label": label,
            "type": "memory",
        })

    for dream in dreams[:10]:
        dream_node_id = len(sankey_nodes)
        themes_label = ", ".join(dream.themes[:2]) if dream.themes else "Dream"
        sankey_nodes.append({
            "id": dream_node_id,
            "label": themes_label,
            "type": "dream",
        })
        seen_convs = set()
        for frag in dream.memory_fragments_used:
            cid = frag.source_conversation_id
            if cid in conv_map and cid not in seen_convs:
                sankey_links.append({
                    "source": conv_map[cid],
                    "target": dream_node_id,
                    "value": 1,
                })
                seen_convs.add(cid)

        for insight in dream.insights:
            insight_node_id = len(sankey_nodes)
            sankey_nodes.append({
                "id": insight_node_id,
                "label": insight.content[:25],
                "type": "insight",
            })
            sankey_links.append({
                "source": dream_node_id,
                "target": insight_node_id,
                "value": 1,
            })

    # Theme cycle data — themes over time
    theme_timeline = []
    for dream in sorted(dreams, key=lambda d: d.timestamp):
        theme_timeline.append({
            "timestamp": dream.timestamp.isoformat(),
            "themes": dream.themes,
            "creativity": dream.creativity_score,
        })

    # Neuron connections — enhanced mind map with weights
    all_themes = Counter()
    for dream in dreams:
        for t in dream.themes:
            all_themes[t.lower().strip()] += 1

    neuron_nodes = []
    neuron_edges = []
    theme_node_map = {}
    for theme, count in all_themes.most_common(20):
        nid = len(neuron_nodes)
        theme_node_map[theme] = nid
        neuron_nodes.append({
            "id": nid,
            "label": theme,
            "weight": count,
            "type": "theme",
        })

    for dream in dreams:
        themes = [t.lower().strip() for t in dream.themes if t.lower().strip() in theme_node_map]
        for i in range(len(themes)):
            for j in range(i + 1, len(themes)):
                neuron_edges.append({
                    "source": theme_node_map[themes[i]],
                    "target": theme_node_map[themes[j]],
                    "weight": 1,
                })

    # Emotion waveform data — each dream's emotional arc
    emotion_waveforms = []
    for dream in sorted(dreams, key=lambda d: d.timestamp):
        if dream.emotions:
            emotion_waveforms.append({
                "dream_id": dream.dream_id,
                "timestamp": dream.timestamp.isoformat(),
                "emotions": [
                    {"emotion": e.emotion, "intensity": e.intensity}
                    for e in dream.emotions
                ],
            })

    # Emotion distribution — aggregate counts across all dreams
    emotion_counter = Counter()
    for dream in dreams:
        for e in dream.emotions:
            emotion_counter[e.emotion.lower()] += 1
    emotion_distribution = [
        {"emotion": em, "count": c}
        for em, c in emotion_counter.most_common(12)
    ]

    return {
        "heat_map": heat_map_words,
        "radar": radar_data,
        "sankey": {"nodes": sankey_nodes, "links": sankey_links},
        "theme_cycle": theme_timeline,
        "neuron": {"nodes": neuron_nodes, "edges": neuron_edges},
        "emotion_waveform": emotion_waveforms,
        "emotion_distribution": emotion_distribution,
        "stats": {
            "total_memories": memory.conversation_count(),
            "total_dreams": len(dreams),
            "total_insights": len(all_insights),
            "total_conversations": len(conversations),
        },
    }
