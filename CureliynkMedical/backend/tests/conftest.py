"""
Shared fixtures for the API tests.

Everything below the HTTP layer is stubbed: these tests are about rate
limiting, validation and error handling, none of which should need a GPU, a
Pinecone index or a paid LLM call to verify.
"""

import functools
import os
import sys
import types
from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[1]

sys.path.insert(0, str(BACKEND_ROOT))


# Settings are read at import time, so they have to be in place before
# anything from `app` is imported.
os.environ.update(
    PINECONE_API_KEY="test",
    GOOGLE_MAPS_API_KEY="test",
    GEMINI_API_KEY="test",
    ANTHROPIC_API_KEY="test",
    DEEPSEEK_API_KEY="test",
    RATE_LIMIT_REQUESTS="3",
    RATE_LIMIT_WINDOW_SECONDS="60",
    ENVIRONMENT="development",
)

# The retriever imports Pinecone at module scope; the tests never reach it.
if "pinecone" not in sys.modules:
    try:
        import pinecone  # noqa: F401
    except ImportError:
        stub = types.ModuleType("pinecone")
        stub.Pinecone = object
        sys.modules["pinecone"] = stub


import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import main  # noqa: E402
from app.api.dependencies import get_application  # noqa: E402
from app.api.rate_limit import _limiter  # noqa: E402


QUERY_URL = "/api/v1/medical/query"


class FakeApplication:
    """Stands in for the pipeline, and records what it was asked."""

    def __init__(self):
        self.calls = []

    def ask(self, query, latitude, longitude, language):
        self.calls.append(
            {
                "query": query,
                "latitude": latitude,
                "longitude": longitude,
                "language": language,
            }
        )

        return {
            "query": query,
            "doctor": {
                "medical_specialty": "Cardiology",
                "medical_specialty_code": "Cardiology",
                "doctor_type": "Cardiologist",
                "urgency": "urgent",
                "reason": "Exertional chest tightness needs a cardiac review.",
                "confidence": 0.82,
            },
            "nearby_specialists": [
                {
                    "name": "Nemcare Superspeciality",
                    "speciality": "Cardiology",
                    "doctor_type": "cardiologist",
                    "distance": 2.4,
                    "location": "Bhangagarh, Guwahati",
                    "latitude": 26.15,
                    "longitude": 91.77,
                    "maps_url": "https://maps.google.com/?cid=1",
                    "place_id": "place-1",
                }
            ],
        }


@pytest.fixture
def pipeline():
    return FakeApplication()


@pytest.fixture(autouse=True)
def fresh_rate_limit_window():
    """
    Empties the limiter between tests.

    The budget is keyed on the client address and every TestClient request
    arrives from the same one, so without this the whole suite shares a single
    three-request window and tests start 429ing each other.
    """

    _limiter._hits.clear()

    yield

    _limiter._hits.clear()


@pytest.fixture
def client(pipeline):
    """A TestClient with the pipeline stubbed out on both load paths."""

    # The lifespan warms `main.get_application`; the route resolves the
    # dependency. Both have to point at the stub.
    real_loader = main.get_application
    main.get_application = functools.lru_cache(maxsize=1)(lambda: pipeline)
    main.app.dependency_overrides[get_application] = lambda: pipeline

    with TestClient(main.app) as test_client:
        yield test_client

    main.app.dependency_overrides.clear()
    main.get_application = real_loader


@pytest.fixture
def client_from(client):
    """
    A second client that appears to come from a different address.

    Takes the `client` fixture first so the stubs and the lifespan are already
    in place; this one only needs to change what Starlette puts in
    `request.client`.
    """

    def factory(host: str):
        return TestClient(main.app, client=(host, 54321))

    return factory


@pytest.fixture
def body():
    return {
        "query": "chest feels tight when I climb stairs",
        "latitude": 26.14,
        "longitude": 91.73,
        "language": "en",
    }
