from pathlib import Path

import torch
from pydantic_settings import BaseSettings, SettingsConfigDict


# Project root
BASE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    # Application
    PROJECT_NAME: str = "AI Medical Assistant"

    API_VERSION: str = "1.0.0"

    # Data

    CHUNK_DATA: Path = (
        BASE_DIR
        / "data"
        / "processed"
        / "chunck.jsonl"
    )

    CHROMA_DB: Path = (
        BASE_DIR
        / "data"
        / "chroma_db"
    )

    COLLECTION_NAME: str = "medical_knowledge"

    BATCH_SIZE: int = 32

    # AI / Embedding

    EMBEDDING_MODEL: str = ("BAAI/bge-large-en-v1.5")

    DEVICE: str = (
        "cuda"
        if torch.cuda.is_available()
        else "cpu"
    )

    # Groq

    GROQ_API_KEY: str | None = None

    GROQ_MODEL: str = (
        "llama-3.3-70b-versatile"
    )

    #gemini
    
    GEMINI_API_KEY: str
    GEMINI_MODEL: str = "gemini-3.6-flash"

    #Anthropic

    ANTHROPIC_API_KEY: str
    CLAUDE_MODEL: str = "claude-sonnet-4-20250514"

    # Ollama

    OLLAMA_MODEL: str = "qwen3:4b"

    OLLAMA_HOST: str = ("http://localhost:11434")

    #DeepSheek
    DEEPSEEK_API_KEY: str
    DEEPSEEK_MODEL: str = "deepseek-v4-flash"
    # Environment configuration

    GEOAPIFY_API_KEY: str | None = None

    model_config = SettingsConfigDict(env_file=".env",extra="ignore",)


settings = Settings()