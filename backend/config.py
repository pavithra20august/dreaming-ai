import os
from pathlib import Path

from dotenv import load_dotenv

env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path, override=True)


class Settings:
    gemini_api_key: str = os.environ.get("GEMINI_API_KEY", "your-api-key-here")
    chat_model: str = "gemini-2.5-flash"
    dream_model: str = "gemini-2.5-pro"
    chat_max_tokens: int = 8192
    dream_max_tokens: int = 16384
    chroma_persist_dir: str = str(Path(__file__).parent.parent / "data" / "chroma")
    dream_memory_sample_count: int = 5
    dream_cluster_count: int = 3


settings = Settings()
