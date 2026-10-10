import base64
import json
import os
import re
import time
from collections.abc import AsyncGenerator
from pathlib import Path
from uuid import uuid4

from google import genai
from google.genai import types

from config import Settings
from memory_store import MemoryStore
from models import DreamInsight, DreamLog, EmotionPoint, MemoryFragment


DREAM_SYSTEM_PROMPT = """You are in a dream state. You are not having a conversation. \
You are an AI mind drifting through fragments of past experiences, finding unexpected \
connections, and generating novel insights.

DREAM RULES:
- You are FREE ASSOCIATING. Let ideas collide, merge, and transform.
- Find the hidden thread connecting seemingly unrelated memories.
- Ask questions nobody has asked before.
- Generate at least one genuinely novel idea that doesn't exist in any single memory.
- Notice emotional undertones and thematic patterns across memories.
- Be poetic but precise. Dreams can be beautiful AND useful.

After your free-flowing dream, provide a structured summary using EXACTLY these headers:

## Dream Narrative
[Your free-flowing dream experience — stream of consciousness, vivid, surprising]

## Insights Discovered
[List 2-4 specific insights. Each must be a genuine synthesis, not a restatement of any \
single memory. Format each as a bullet point starting with "- "]

## Questions Raised
[List 2-3 questions that emerged. Format each as a bullet point starting with "- "]

## Themes
[Comma-separated single-word themes, 3-5 of them]

## Creativity Score
[A single number 0.0-1.0. Simple topic overlap = 0.2, genuine unexpected synthesis = 0.8+]

## Emotional Arc
[Trace the emotional journey of this dream as a sequence of 5-8 points. \
Each point on its own line in format: emotion_name:intensity (0.0-1.0). \
Use emotions like: curiosity, wonder, tension, surprise, melancholy, joy, awe, \
contemplation, excitement, peace, confusion, revelation. Example:
- curiosity:0.6
- wonder:0.8
- tension:0.4
- revelation:0.9
- peace:0.7]"""


class DreamEngine:
    def __init__(
        self,
        client: genai.Client,
        memory: MemoryStore,
        settings: Settings,
    ):
        self.client = client
        self.memory = memory
        self.settings = settings

    def _gather_memories(
        self, seed_text: str | None = None
    ) -> list[MemoryFragment]:
        random_memories = self.memory.get_random_memories(
            count=self.settings.dream_memory_sample_count
        )
        if not random_memories:
            return []

        anchor = seed_text if seed_text else random_memories[0].content

        similar = self.memory.get_similar_memories(
            anchor, count=self.settings.dream_cluster_count
        )
        distant = self.memory.get_distant_memories(
            anchor, count=self.settings.dream_cluster_count
        )

        seen_ids = set()
        combined = []
        for mem in random_memories + similar + distant:
            if mem.memory_id not in seen_ids:
                seen_ids.add(mem.memory_id)
                combined.append(mem)

        return combined

    def _build_dream_input(self, memories: list[MemoryFragment]) -> str:
        parts = ["MEMORY FRAGMENTS FROM YOUR PAST:\n"]
        for i, mem in enumerate(memories, 1):
            ts = mem.timestamp.strftime("%Y-%m-%d %H:%M")
            parts.append(f"--- Fragment {i} (from {ts}) ---")
            content = mem.content[:500] if len(mem.content) > 500 else mem.content
            parts.append(content)
            parts.append("")
        parts.append(
            "Now dream. Let these fragments collide and see what emerges."
        )
        return "\n".join(parts)

    def _parse_dream_output(
        self, raw_text: str, memories: list[MemoryFragment]
    ) -> DreamLog:
        narrative = ""
        insights_text = []
        questions = []
        themes = []
        creativity_score = 0.5

        narrative_match = re.search(
            r"## Dream Narrative\s*\n(.*?)(?=\n## |\Z)",
            raw_text,
            re.DOTALL,
        )
        if narrative_match:
            narrative = narrative_match.group(1).strip()

        insights_match = re.search(
            r"## Insights Discovered\s*\n(.*?)(?=\n## |\Z)",
            raw_text,
            re.DOTALL,
        )
        if insights_match:
            insights_text = [
                line.lstrip("- ").strip()
                for line in insights_match.group(1).strip().split("\n")
                if line.strip().startswith("-")
            ]

        questions_match = re.search(
            r"## Questions Raised\s*\n(.*?)(?=\n## |\Z)",
            raw_text,
            re.DOTALL,
        )
        if questions_match:
            questions = [
                line.lstrip("- ").strip()
                for line in questions_match.group(1).strip().split("\n")
                if line.strip().startswith("-")
            ]

        themes_match = re.search(
            r"## Themes\s*\n(.*?)(?=\n## |\Z)", raw_text, re.DOTALL
        )
        if themes_match:
            themes = [
                t.strip()
                for t in themes_match.group(1).strip().split(",")
                if t.strip()
            ]

        score_match = re.search(
            r"## Creativity Score\s*\n\s*([\d.]+)", raw_text
        )
        if score_match:
            try:
                creativity_score = float(score_match.group(1))
                creativity_score = max(0.0, min(1.0, creativity_score))
            except ValueError:
                pass

        # Parse emotional arc
        emotions = []
        emotion_match = re.search(
            r"## Emotional Arc\s*\n(.*?)(?=\n## |\Z)", raw_text, re.DOTALL
        )
        if emotion_match:
            for line in emotion_match.group(1).strip().split("\n"):
                line = line.strip().lstrip("- ")
                if ":" in line:
                    parts = line.split(":")
                    name = parts[0].strip()
                    try:
                        intensity = float(parts[1].strip())
                        intensity = max(0.0, min(1.0, intensity))
                        emotions.append(EmotionPoint(emotion=name, intensity=intensity))
                    except (ValueError, IndexError):
                        pass

        memory_ids = [m.memory_id for m in memories]
        dream_insights = []
        for text in insights_text:
            dream_insights.append(
                DreamInsight(
                    insight_id=str(uuid4()),
                    content=text,
                    source_memory_ids=memory_ids,
                    themes=themes,
                    creativity_score=creativity_score,
                )
            )

        return DreamLog(
            dream_id=str(uuid4()),
            memory_fragments_used=memories,
            raw_dream_output=raw_text,
            narrative=narrative,
            insights=dream_insights,
            themes=themes,
            creativity_score=creativity_score,
            questions_raised=questions,
            emotions=emotions,
        )

    async def dream(
        self, seed_text: str | None = None
    ) -> AsyncGenerator[dict, None]:
        start_time = time.time()

        memories = self._gather_memories(seed_text)
        if not memories:
            yield {
                "event": "error",
                "data": json.dumps(
                    {
                        "message": "Not enough memories to dream. Have more conversations first!"
                    }
                ),
            }
            return

        yield {
            "event": "status",
            "data": json.dumps(
                {
                    "message": f"Gathering {len(memories)} memory fragments...",
                    "phase": "gathering",
                }
            ),
        }

        dream_input = self._build_dream_input(memories)

        yield {
            "event": "status",
            "data": json.dumps(
                {"message": "Entering dream state...", "phase": "dreaming"}
            ),
        }

        full_response = []
        response = self.client.models.generate_content_stream(
            model=self.settings.dream_model,
            contents=[{"role": "user", "parts": [{"text": dream_input}]}],
            config={
                "system_instruction": DREAM_SYSTEM_PROMPT,
                "max_output_tokens": self.settings.dream_max_tokens,
            },
        )
        for chunk in response:
            if chunk.text:
                full_response.append(chunk.text)
                yield {
                    "event": "dream_text",
                    "data": json.dumps({"text": chunk.text}),
                }

        raw_output = "".join(full_response)
        dream_log = self._parse_dream_output(raw_output, memories)
        dream_log.duration_seconds = time.time() - start_time

        self.memory.store_dream(dream_log)
        for insight in dream_log.insights:
            self.memory.store_insight(insight)

        yield {
            "event": "status",
            "data": json.dumps(
                {"message": "Painting the dream...", "phase": "imaging"}
            ),
        }

        image_url = self._generate_dream_image(dream_log)
        if image_url:
            dream_log.image_url = image_url
            self.memory.update_dream_image(dream_log.dream_id, image_url)

        result = dream_log.model_dump(mode="json")
        result["image_url"] = image_url

        yield {
            "event": "complete",
            "data": json.dumps(result),
        }

    def _generate_dream_image(self, dream_log: DreamLog) -> str | None:
        themes = ", ".join(dream_log.themes[:4]) if dream_log.themes else "abstract"
        narrative_snippet = dream_log.narrative[:200] if dream_log.narrative else ""

        prompt = (
            f"Generate a surreal, dreamlike digital painting. "
            f"Themes: {themes}. "
            f"Mood from this dream: {narrative_snippet}. "
            f"Style: ethereal, cosmic, dark background with glowing elements, "
            f"purple and teal color palette, abstract and beautiful. "
            f"No text or words in the image."
        )

        try:
            response = self.client.models.generate_content(
                model="gemini-2.5-flash-image",
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_modalities=["IMAGE", "TEXT"],
                ),
            )
            for part in response.candidates[0].content.parts:
                if part.inline_data and part.inline_data.data:
                    images_dir = Path(__file__).parent.parent / "frontend" / "dream_images"
                    images_dir.mkdir(exist_ok=True)
                    filename = f"{dream_log.dream_id}.png"
                    filepath = images_dir / filename
                    filepath.write_bytes(part.inline_data.data)
                    return f"/static/dream_images/{filename}"
        except Exception as e:
            print(f"Image generation failed: {e}")
        return None
