from functools import cached_property
from pathlib import Path

import torch
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


# Project root
BASE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    # Application

    PROJECT_NAME: str = "AI Medical Assistant"

    API_VERSION: str = "1.0.0"

    # "development" | "staging" | "production".
    # Production turns off the interactive docs, requires HTTPS-only cookies
    # headers, and refuses to start with an insecure configuration.
    ENVIRONMENT: str = "development"

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
    #pine cone
    PINECONE_API_KEY: str

    PINECONE_INDEX_NAME: str = "medical-knowledge"

    PINECONE_NAMESPACE: str = "medical_knowledge"   

    # Groq
    #GOOGLE MAPS
    
    GOOGLE_MAPS_API_KEY: str

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

    # =====================================================
    # API SECURITY
    # =====================================================
    #
    # Accounts, passwords, tokens and sessions all belong to the Node API;
    # this service verifies nothing and identifies nobody. Every setting below
    # is therefore a perimeter control, and they are the only thing standing
    # between this endpoint and whoever can reach the port.

    # Browser origins allowed to call this API, comma separated. Native
    # mobile builds send no Origin header and are unaffected by CORS; this
    # exists for the Vite web frontend and for Expo web.
    # An empty value means "no browser origin is allowed".
    ALLOWED_ORIGINS: str = (
        "http://localhost:5173,"
        "http://127.0.0.1:5173"
    )

    # Host header allowlist ("*" disables the check). Set this to your real
    # domain in production to block Host-header spoofing.
    ALLOWED_HOSTS: str = "*"

    # Per-client-address request budget — there is no account to key it on
    # here. The pipeline runs an embedding model, a reranker and one or more
    # paid LLM calls per request, so this is a cost control as much as an
    # abuse control.
    RATE_LIMIT_REQUESTS: int = 10

    RATE_LIMIT_WINDOW_SECONDS: int = 60

    # Longest symptom description accepted. Long inputs are the cheapest way
    # to burn tokens and to smuggle prompt-injection payloads.
    MAX_QUERY_CHARS: int = 800

    model_config = SettingsConfigDict(env_file=".env",extra="ignore",)

    @field_validator("ENVIRONMENT")
    @classmethod
    def _normalize_environment(cls, value: str) -> str:
        return value.strip().lower()

    @cached_property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    @cached_property
    def allowed_origins(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.ALLOWED_ORIGINS.split(",")
            if origin.strip()
        ]

    @cached_property
    def allowed_hosts(self) -> list[str]:
        hosts = [
            host.strip()
            for host in self.ALLOWED_HOSTS.split(",")
            if host.strip()
        ]
        return hosts or ["*"]

    def validate_runtime_security(self) -> None:
        """
        Fail fast on a configuration that would silently ship insecure.

        Called once from the application lifespan, so a misconfigured deploy
        crashes on boot instead of serving traffic it should not.

        The endpoint is open — it has no login of its own — so the host and
        origin allowlists below are the whole perimeter, and a wildcard in
        either is refused in production.
        """

        problems: list[str] = []

        if self.is_production and "*" in self.allowed_hosts:
            problems.append(
                "ALLOWED_HOSTS is '*' in production. Set it to the "
                "domain(s) this API is served from."
            )

        if self.is_production and "*" in self.allowed_origins:
            problems.append(
                "ALLOWED_ORIGINS contains '*' in production. List the exact "
                "web origins instead."
            )

        if problems:
            raise RuntimeError(
                "Insecure configuration:\n  - "
                + "\n  - ".join(problems)
            )


settings = Settings()
