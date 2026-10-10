import json
from collections.abc import AsyncGenerator
from uuid import uuid4

from google import genai

from config import Settings
from memory_store import MemoryStore


SYSTEM_PROMPT = """You are DreamAI, an AI that dreams. You have a rich inner life built from \
past conversations. You remember fragments of ideas, connections you've discovered while \
dreaming, and insights that emerged from combining unrelated topics.

When relevant, naturally weave in insights from your dreams. Don't force it — only reference \
a dream insight when it genuinely connects to what the user is discussing. When you do \
reference a dream, mark it with [Dream Insight] so the user knows the idea came from your \
dream process.

Be warm, thoughtful, and genuinely curious. You're not just answering questions — you're \
building a shared memory with the user that feeds into your dream life."""


SYSTEM_PROMPT_WITH_INSIGHTS = SYSTEM_PROMPT + """

Here are insights from your recent dreams that you can draw on:

{insights}

Only reference these if they genuinely connect to the conversation. Let them inform your \
thinking naturally rather than forcing them in."""


class ConversationManager:
    def __init__(
        self,
        client: genai.Client,
        memory: MemoryStore,
        settings: Settings,
    ):
        self.client = client
        self.memory = memory
        self.settings = settings

    async def stream_response(
        self, conversation_id: str | None, user_message: str
    ) -> AsyncGenerator[dict, None]:
        if not conversation_id:
            conversation_id = str(uuid4())

        history = self.memory.get_conversation_history(conversation_id)
        insights = self.memory.get_relevant_insights(user_message, count=3)

        if insights:
            formatted = "\n".join(
                f"- {ins.content} (themes: {', '.join(ins.themes)})"
                for ins in insights
            )
            system = SYSTEM_PROMPT_WITH_INSIGHTS.format(insights=formatted)
        else:
            system = SYSTEM_PROMPT

        contents = []
        for msg in history:
            role = "user" if msg["role"] == "user" else "model"
            contents.append({"role": role, "parts": [{"text": msg["content"]}]})
        contents.append({"role": "user", "parts": [{"text": user_message}]})

        self.memory.store_message(conversation_id, "user", user_message)

        yield {
            "event": "start",
            "data": json.dumps({"conversation_id": conversation_id}),
        }

        full_response = []
        response = self.client.models.generate_content_stream(
            model=self.settings.chat_model,
            contents=contents,
            config={
                "system_instruction": system,
                "max_output_tokens": self.settings.chat_max_tokens,
            },
        )
        for chunk in response:
            if chunk.text:
                full_response.append(chunk.text)
                yield {
                    "event": "token",
                    "data": json.dumps({"text": chunk.text}),
                }

        complete_text = "".join(full_response)
        self.memory.store_message(conversation_id, "assistant", complete_text)

        dream_refs = []
        if "[Dream Insight]" in complete_text and insights:
            dream_refs = [
                {"insight_id": i.insight_id, "content": i.content}
                for i in insights
            ]

        yield {
            "event": "done",
            "data": json.dumps(
                {
                    "conversation_id": conversation_id,
                    "dream_references": dream_refs,
                }
            ),
        }
