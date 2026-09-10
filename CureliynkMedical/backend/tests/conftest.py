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
# 32+ bytes, matching what production requires, so the suite exercises a
# realistically sized key rather than one PyJWT warns about.
JWT_SECRET = "test-signing-secret-padded-to-32-bytes"

os.environ.update(
    PINECONE_API_KEY="test",
    GOOGLE_MAPS_API_KEY="test",
    GEMINI_API_KEY="test",
    ANTHROPIC_API_KEY="test",
    DEEPSEEK_API_KEY="test",
    RATE_LIMIT_REQUESTS="3",
    RATE_LIMIT_WINDOW_SECONDS="60",
    ENVIRONMENT="development",
    # Set here so the suite exercises the authenticated path — the one that
    # runs in production. The open path is covered explicitly, by the test
    # that unsets it.
    JWT_SECRET=JWT_SECRET,
)

# The retriever imports Pinecone at module scope; the tests never reach it.
if "pinecone" not in sys.modules:
    try:
        import pinecone  # noqa: F401
    except ImportError:
        stub = types.ModuleType("pinecone")
        stub.Pinecone = object
        sys.modules["pinecone"] = stub


import time  # noqa: E402

import jwt  # noqa: E402
import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import main  # noqa: E402
from app.api.dependencies import get_application  # noqa: E402
from app.api.rate_limit import _limiter  # noqa: E402


QUERY_URL = "/api/v1/medical/query"


def make_token(
    *,
    user_id: str = "user-1",
    role: str = "patient",
    email: str = "patient@example.com",
    expires_in: int = 900,
    secret: str = JWT_SECRET,
    **overrides,
) -> str:
    """
    An access token shaped exactly like the Node API's.

    `server/src/utils/jwt.utils.js` signs `{ id, role, email }` with HS256 and
    a 15-minute expiry; the tests are only meaningful if what they send is the
    same thing. `expires_in` may be negative, to build one that already aged
    out.
    """

    claims = {
        "id": user_id,
        "role": role,
        "email": email,
        "iat": int(time.time()),
        "exp": int(time.time()) + expires_in,
    }

    claims.update(overrides)

    # `None` removes a claim, so a test can build a token that is missing one.
    claims = {k: v for k, v in claims.items() if v is not None}

    return jwt.encode(claims, secret, algorithm="HS256")


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


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

    The budget is keyed on the account, and every test signs in as the same
    one, so without this the whole suite shares a single three-request window
    and tests start 429ing each other.
    """

    _limiter._hits.clear()

    yield

    _limiter._hits.clear()


@pytest.fixture
def anonymous_client(pipeline):
    """
    A TestClient with the pipeline stubbed out on both load paths, sending no
    credentials.

    Most tests want `client` instead. This one exists for the tests that are
    about the absence of a token.
    """

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
def client(anonymous_client):
    """
    The default client: signed in, with a valid access token.

    Authenticated by default because that is how the endpoint is actually
    reached in production, so a test about validation or rate limiting should
    not have to restate the login to say anything about them. httpx lets a
    per-request `headers=` override this one, which is how the tests below
    send an expired or forged token instead.
    """

    anonymous_client.headers.update(bearer(make_token()))

    return anonymous_client


@pytest.fixture
def client_as(client):
    """
    Builds a client signed in as some other account.

    Takes the `client` fixture first so the stubs and the lifespan are already
    in place; this one only changes whose token is sent. Used to show that one
    user exhausting the budget leaves everyone else alone — which is the whole
    point of keying the window on the account rather than the IP.
    """

    def factory(user_id: str, host: str = "203.0.113.7"):
        other = TestClient(main.app, client=(host, 54321))
        other.headers.update(bearer(make_token(user_id=user_id)))
        return other

    return factory


@pytest.fixture
def body():
    return {
        "query": "chest feels tight when I climb stairs",
        "latitude": 26.14,
        "longitude": 91.73,
        "language": "en",
    }
