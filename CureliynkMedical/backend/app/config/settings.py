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
    # Accounts, passwords and sessions all belong to the Node API: it is the
    # only service that can mint a token. What this service does is *verify*
    # one, using the same signing secret, so a caller has to have signed in
    # before it will spend an LLM call on them.

    # The Node API's `JWT_SECRET`, verbatim. Access tokens are signed with it
    # (HS256, `{ id, role, email }`, 15-minute life) in
    # `server/src/utils/jwt.utils.js`, and verified here with the same value —
    # so the two services MUST be given the identical string, and rotating it
    # on one side signs every user out until the other side follows.
    #
    # Left unset, the endpoint runs open, which is convenient for local work
    # against the pipeline alone. Production refuses to start that way.
    JWT_SECRET: str | None = None

    # Pinned, and passed to the decoder as the *only* accepted algorithm.
    # Accepting whatever the token's own header asks for is how "alg: none"
    # and RS256-key-as-HMAC-secret forgeries get in.
    JWT_ALGORITHM: str = "HS256"

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

    # Per-caller request budget. The pipeline runs an embedding model, a
    # reranker and one or more paid LLM calls per request, so this is a cost
    # control as much as an abuse control. With `JWT_SECRET` set the window is
    # keyed on the account; without it, on the client address.
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

    @cached_property
    def auth_enabled(self) -> bool:
        """
        Whether callers must present a token from the Node API.

        A blank or whitespace-only secret counts as unset: an env var that
        exists but is empty is the usual shape of a misconfigured deploy, and
        it must not be mistaken for "a secret was supplied".
        """

        return bool((self.JWT_SECRET or "").strip())

    def validate_runtime_security(self) -> None:
        """
        Fail fast on a configuration that would silently ship insecure.

        Called once from the application lifespan, so a misconfigured deploy
        crashes on boot instead of serving traffic it should not.

        Every check here guards something that fails *quietly* — an open
        endpoint still answers, a wildcard host still serves — which is
        exactly the kind of mistake that survives to production otherwise.
        """

        problems: list[str] = []

        if self.is_production and not self.auth_enabled:
            problems.append(
                "JWT_SECRET is not set in production. Every request would be "
                "unauthenticated, and each one costs an embedding pass, a "
                "rerank and at least one paid LLM call. Set it to the same "
                "value as the Node API's JWT_SECRET."
            )

        # Checked in every environment, not just production, because it is a
        # correctness bug rather than a hardening measure — and it fails in
        # the most confusing way possible.
        #
        # "#" opens an inline comment in a .env file, and the two parsers
        # disagree about it: Node's `dotenv` truncates the value there, while
        # Python's `python-dotenv` keeps the rest. Identical .env text then
        # gives the Node API one signing key and this service a different
        # verifying key, so every token fails its signature check and the app
        # shows "your session has ended" on a perfectly good login.
        if self.auth_enabled and "#" in self.JWT_SECRET:
            problems.append(
                "JWT_SECRET contains '#'. Node's dotenv treats it as the "
                "start of a comment and truncates the value there, so the "
                "two services would sign and verify with different keys. "
                "Use a secret without '#' — `openssl rand -hex 32` gives one "
                "that is safe in every .env parser, shell and deploy UI."
            )

        # RFC 7518 section 3.2: an HMAC key shorter than the hash it feeds
        # weakens HS256, and a short one is guessable offline by anyone
        # holding a single token. Checked in production only, so the
        # throwaway secrets in the test suite stay usable.
        if (
            self.is_production
            and self.auth_enabled
            and len(self.JWT_SECRET.strip().encode("utf-8")) < 32
        ):
            problems.append(
                "JWT_SECRET is shorter than 32 bytes. Generate one with "
                "`openssl rand -base64 48` and set the same value on the "
                "Node API."
            )

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
