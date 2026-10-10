from datetime import datetime
from uuid import uuid4

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    message_id: str = Field(default_factory=lambda: str(uuid4()))
    conversation_id: str
    role: str
    content: str
    timestamp: datetime = Field(default_factory=datetime.now)


class ConversationSummary(BaseModel):
    conversation_id: str
    title: str
    message_count: int
    created_at: datetime
    updated_at: datetime


class MemoryFragment(BaseModel):
    memory_id: str
    source_conversation_id: str
    content: str
    timestamp: datetime
    topics: list[str] = []


class DreamInsight(BaseModel):
    insight_id: str = Field(default_factory=lambda: str(uuid4()))
    content: str
    source_memory_ids: list[str] = []
    themes: list[str] = []
    creativity_score: float = 0.0
    questions_raised: list[str] = []
    timestamp: datetime = Field(default_factory=datetime.now)


class EmotionPoint(BaseModel):
    emotion: str
    intensity: float = 0.0


class DreamLog(BaseModel):
    dream_id: str = Field(default_factory=lambda: str(uuid4()))
    memory_fragments_used: list[MemoryFragment] = []
    raw_dream_output: str = ""
    narrative: str = ""
    insights: list[DreamInsight] = []
    themes: list[str] = []
    creativity_score: float = 0.0
    questions_raised: list[str] = []
    emotions: list[EmotionPoint] = []
    image_url: str | None = None
    timestamp: datetime = Field(default_factory=datetime.now)
    duration_seconds: float = 0.0


class MindMapNode(BaseModel):
    id: str
    label: str
    type: str  # "conversation", "dream", "insight"
    metadata: dict = {}


class MindMapEdge(BaseModel):
    source: str
    target: str
    relationship: str
    weight: float = 1.0


class MindMapData(BaseModel):
    nodes: list[MindMapNode] = []
    edges: list[MindMapEdge] = []


class ChatRequest(BaseModel):
    message: str
    conversation_id: str | None = None


class DreamRequest(BaseModel):
    seed_text: str | None = None
