import json
import random
from datetime import datetime
from uuid import uuid4

import chromadb

from models import (
    ChatMessage,
    ConversationSummary,
    DreamInsight,
    DreamLog,
    EmotionPoint,
    MemoryFragment,
    MindMapData,
    MindMapEdge,
    MindMapNode,
)


class MemoryStore:
    def __init__(self, persist_dir: str):
        self.client = chromadb.PersistentClient(path=persist_dir)
        self.conversations = self.client.get_or_create_collection(
            "conversations", metadata={"hnsw:space": "cosine"}
        )
        self.dreams = self.client.get_or_create_collection(
            "dreams", metadata={"hnsw:space": "cosine"}
        )
        self.insights = self.client.get_or_create_collection(
            "insights", metadata={"hnsw:space": "cosine"}
        )

    def conversation_count(self) -> int:
        return self.conversations.count()

    def store_message(self, conversation_id: str, role: str, content: str) -> str:
        message_id = str(uuid4())
        self.conversations.add(
            ids=[message_id],
            documents=[content],
            metadatas=[
                {
                    "conversation_id": conversation_id,
                    "role": role,
                    "timestamp": datetime.now().isoformat(),
                }
            ],
        )
        return message_id

    def get_conversation_history(self, conversation_id: str) -> list[dict]:
        results = self.conversations.get(
            where={"conversation_id": conversation_id},
            include=["documents", "metadatas"],
        )
        if not results["ids"]:
            return []
        messages = []
        for i, msg_id in enumerate(results["ids"]):
            messages.append(
                {
                    "id": msg_id,
                    "role": results["metadatas"][i]["role"],
                    "content": results["documents"][i],
                    "timestamp": results["metadatas"][i]["timestamp"],
                }
            )
        messages.sort(key=lambda m: m["timestamp"])
        return messages

    def get_all_conversations(self) -> list[ConversationSummary]:
        results = self.conversations.get(include=["metadatas", "documents"])
        if not results["ids"]:
            return []

        convos: dict[str, list[dict]] = {}
        for i, msg_id in enumerate(results["ids"]):
            cid = results["metadatas"][i]["conversation_id"]
            if cid not in convos:
                convos[cid] = []
            convos[cid].append(
                {
                    "role": results["metadatas"][i]["role"],
                    "content": results["documents"][i],
                    "timestamp": results["metadatas"][i]["timestamp"],
                }
            )

        summaries = []
        for cid, msgs in convos.items():
            msgs.sort(key=lambda m: m["timestamp"])
            first_user_msg = next(
                (m for m in msgs if m["role"] == "user"), msgs[0]
            )
            title = first_user_msg["content"][:60]
            if len(first_user_msg["content"]) > 60:
                title += "..."
            summaries.append(
                ConversationSummary(
                    conversation_id=cid,
                    title=title,
                    message_count=len(msgs),
                    created_at=datetime.fromisoformat(msgs[0]["timestamp"]),
                    updated_at=datetime.fromisoformat(msgs[-1]["timestamp"]),
                )
            )
        summaries.sort(key=lambda s: s.updated_at, reverse=True)
        return summaries

    def get_random_memories(
        self, count: int = 5, exclude_conversation_id: str | None = None
    ) -> list[MemoryFragment]:
        results = self.conversations.get(include=["documents", "metadatas"])
        if not results["ids"]:
            return []

        candidates = []
        for i, msg_id in enumerate(results["ids"]):
            meta = results["metadatas"][i]
            if meta["role"] != "assistant":
                continue
            if exclude_conversation_id and meta["conversation_id"] == exclude_conversation_id:
                continue
            candidates.append(
                MemoryFragment(
                    memory_id=msg_id,
                    source_conversation_id=meta["conversation_id"],
                    content=results["documents"][i],
                    timestamp=datetime.fromisoformat(meta["timestamp"]),
                )
            )

        if not candidates:
            all_msgs = []
            for i, msg_id in enumerate(results["ids"]):
                meta = results["metadatas"][i]
                all_msgs.append(
                    MemoryFragment(
                        memory_id=msg_id,
                        source_conversation_id=meta["conversation_id"],
                        content=results["documents"][i],
                        timestamp=datetime.fromisoformat(meta["timestamp"]),
                    )
                )
            candidates = all_msgs

        return random.sample(candidates, min(count, len(candidates)))

    def get_similar_memories(
        self, anchor_text: str, count: int = 3
    ) -> list[MemoryFragment]:
        total = self.conversations.count()
        if total == 0:
            return []
        results = self.conversations.query(
            query_texts=[anchor_text],
            n_results=min(count, total),
            include=["documents", "metadatas", "distances"],
        )
        fragments = []
        for i, msg_id in enumerate(results["ids"][0]):
            meta = results["metadatas"][0][i]
            fragments.append(
                MemoryFragment(
                    memory_id=msg_id,
                    source_conversation_id=meta["conversation_id"],
                    content=results["documents"][0][i],
                    timestamp=datetime.fromisoformat(meta["timestamp"]),
                )
            )
        return fragments

    def get_distant_memories(
        self, anchor_text: str, count: int = 3
    ) -> list[MemoryFragment]:
        total = self.conversations.count()
        if total == 0:
            return []
        fetch_count = min(total, max(count * 5, 20))
        results = self.conversations.query(
            query_texts=[anchor_text],
            n_results=fetch_count,
            include=["documents", "metadatas", "distances"],
        )
        fragments = []
        ids = results["ids"][0]
        for i in range(len(ids) - 1, max(len(ids) - 1 - count, -1), -1):
            meta = results["metadatas"][0][i]
            fragments.append(
                MemoryFragment(
                    memory_id=ids[i],
                    source_conversation_id=meta["conversation_id"],
                    content=results["documents"][0][i],
                    timestamp=datetime.fromisoformat(meta["timestamp"]),
                )
            )
        return fragments

    def store_dream(self, dream_log: DreamLog) -> None:
        self.dreams.add(
            ids=[dream_log.dream_id],
            documents=[dream_log.raw_dream_output],
            metadatas=[
                {
                    "timestamp": dream_log.timestamp.isoformat(),
                    "themes": json.dumps(dream_log.themes),
                    "creativity_score": dream_log.creativity_score,
                    "source_memory_ids": json.dumps(
                        [m.memory_id for m in dream_log.memory_fragments_used]
                    ),
                    "narrative": dream_log.narrative[:1000],
                    "questions": json.dumps(dream_log.questions_raised),
                    "insights_json": json.dumps(
                        [i.model_dump(mode="json") for i in dream_log.insights]
                    ),
                    "emotions_json": json.dumps(
                        [e.model_dump() for e in dream_log.emotions]
                    ),
                    "image_url": dream_log.image_url or "",
                    "duration_seconds": dream_log.duration_seconds,
                }
            ],
        )

    def update_dream_image(self, dream_id: str, image_url: str) -> None:
        result = self.dreams.get(ids=[dream_id], include=["metadatas"])
        if result["ids"]:
            meta = result["metadatas"][0]
            meta["image_url"] = image_url
            self.dreams.update(ids=[dream_id], metadatas=[meta])

    def store_insight(self, insight: DreamInsight) -> None:
        self.insights.add(
            ids=[insight.insight_id],
            documents=[insight.content],
            metadatas=[
                {
                    "timestamp": insight.timestamp.isoformat(),
                    "themes": json.dumps(insight.themes),
                    "creativity_score": insight.creativity_score,
                    "source_memory_ids": json.dumps(insight.source_memory_ids),
                }
            ],
        )

    def get_relevant_insights(
        self, query_text: str, count: int = 3
    ) -> list[DreamInsight]:
        total = self.insights.count()
        if total == 0:
            return []
        results = self.insights.query(
            query_texts=[query_text],
            n_results=min(count, total),
            include=["documents", "metadatas"],
        )
        insights = []
        for i, insight_id in enumerate(results["ids"][0]):
            meta = results["metadatas"][0][i]
            insights.append(
                DreamInsight(
                    insight_id=insight_id,
                    content=results["documents"][0][i],
                    themes=json.loads(meta.get("themes", "[]")),
                    creativity_score=meta.get("creativity_score", 0.0),
                    source_memory_ids=json.loads(
                        meta.get("source_memory_ids", "[]")
                    ),
                    timestamp=datetime.fromisoformat(meta["timestamp"]),
                )
            )
        return insights

    def get_all_insights(self) -> list[DreamInsight]:
        results = self.insights.get(include=["documents", "metadatas"])
        if not results["ids"]:
            return []
        insights = []
        for i, insight_id in enumerate(results["ids"]):
            meta = results["metadatas"][i]
            insights.append(
                DreamInsight(
                    insight_id=insight_id,
                    content=results["documents"][i],
                    themes=json.loads(meta.get("themes", "[]")),
                    creativity_score=meta.get("creativity_score", 0.0),
                    source_memory_ids=json.loads(
                        meta.get("source_memory_ids", "[]")
                    ),
                    timestamp=datetime.fromisoformat(meta["timestamp"]),
                )
            )
        return insights

    def get_all_dreams(
        self, limit: int = 50, offset: int = 0
    ) -> list[DreamLog]:
        results = self.dreams.get(include=["documents", "metadatas"])
        if not results["ids"]:
            return []

        dreams = []
        for i, dream_id in enumerate(results["ids"]):
            meta = results["metadatas"][i]
            insights_data = json.loads(meta.get("insights_json", "[]"))
            insights = [DreamInsight(**d) for d in insights_data]
            source_ids = json.loads(meta.get("source_memory_ids", "[]"))
            fragments = []
            if source_ids:
                existing = self.conversations.get(
                    ids=source_ids, include=["documents", "metadatas"]
                )
                for j, fid in enumerate(existing["ids"]):
                    fmeta = existing["metadatas"][j]
                    fragments.append(
                        MemoryFragment(
                            memory_id=fid,
                            source_conversation_id=fmeta["conversation_id"],
                            content=existing["documents"][j],
                            timestamp=datetime.fromisoformat(
                                fmeta["timestamp"]
                            ),
                        )
                    )

            emotions_data = json.loads(meta.get("emotions_json", "[]"))
            emotions = [EmotionPoint(**e) for e in emotions_data]

            dreams.append(
                DreamLog(
                    dream_id=dream_id,
                    memory_fragments_used=fragments,
                    raw_dream_output=results["documents"][i],
                    narrative=meta.get("narrative", ""),
                    insights=insights,
                    themes=json.loads(meta.get("themes", "[]")),
                    creativity_score=meta.get("creativity_score", 0.0),
                    questions_raised=json.loads(
                        meta.get("questions", "[]")
                    ),
                    emotions=emotions,
                    image_url=meta.get("image_url", "") or None,
                    timestamp=datetime.fromisoformat(meta["timestamp"]),
                    duration_seconds=meta.get("duration_seconds", 0.0),
                )
            )

        dreams.sort(key=lambda d: d.timestamp, reverse=True)
        return dreams[offset : offset + limit]

    def get_mind_map_data(self) -> MindMapData:
        nodes = []
        edges = []

        convos = self.get_all_conversations()
        for c in convos:
            nodes.append(
                MindMapNode(
                    id=c.conversation_id,
                    label=c.title,
                    type="conversation",
                    metadata={
                        "message_count": c.message_count,
                        "created_at": c.created_at.isoformat(),
                    },
                )
            )

        dreams = self.get_all_dreams()
        for d in dreams:
            nodes.append(
                MindMapNode(
                    id=d.dream_id,
                    label=f"Dream: {', '.join(d.themes[:3])}" if d.themes else "Dream",
                    type="dream",
                    metadata={
                        "creativity_score": d.creativity_score,
                        "timestamp": d.timestamp.isoformat(),
                    },
                )
            )
            for frag in d.memory_fragments_used:
                edges.append(
                    MindMapEdge(
                        source=d.dream_id,
                        target=frag.source_conversation_id,
                        relationship="dreamed_from",
                        weight=0.8,
                    )
                )

            for insight in d.insights:
                nodes.append(
                    MindMapNode(
                        id=insight.insight_id,
                        label=insight.content[:40] + "..." if len(insight.content) > 40 else insight.content,
                        type="insight",
                        metadata={
                            "creativity_score": insight.creativity_score,
                        },
                    )
                )
                edges.append(
                    MindMapEdge(
                        source=insight.insight_id,
                        target=d.dream_id,
                        relationship="insight_from",
                        weight=1.0,
                    )
                )

        seen = set()
        unique_nodes = []
        for n in nodes:
            if n.id not in seen:
                seen.add(n.id)
                unique_nodes.append(n)

        seen_edges = set()
        unique_edges = []
        for e in edges:
            key = (e.source, e.target)
            if key not in seen_edges:
                seen_edges.add(key)
                unique_edges.append(e)

        return MindMapData(nodes=unique_nodes, edges=unique_edges)
