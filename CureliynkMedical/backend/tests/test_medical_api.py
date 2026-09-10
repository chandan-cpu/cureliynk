"""
Contract and hardening tests for POST /api/v1/medical/query.

The mobile app talks to this endpoint directly, so what is asserted here is
mostly what it refuses to do — starting with refusing anyone who is not signed
in. The Node API mints the tokens; this service verifies them with the shared
secret, and the exact `X-Auth-Error` codes below are a contract the app relies
on to tell "refresh and retry" apart from "send the user to sign in".
"""

import time

import jwt
import pytest

from app.config.settings import Settings, settings
from tests.conftest import QUERY_URL, bearer, make_token


# ---------------------------------------------------------------------------
# The answer
# ---------------------------------------------------------------------------

def test_a_valid_token_is_accepted(client, body):
    """A token signed with the shared secret gets through to the pipeline."""

    response = client.post(QUERY_URL, json=body)

    assert response.status_code == 200


@pytest.mark.parametrize(
    "headers",
    [
        pytest.param({}, id="no header"),
        pytest.param({"Authorization": "Bearer "}, id="empty token"),
        pytest.param({"Authorization": "abc.def.ghi"}, id="no scheme"),
        pytest.param({"Authorization": "Basic dXNlcjpwdw=="}, id="wrong scheme"),
    ],
)
def test_a_request_without_a_bearer_token_is_refused(
    anonymous_client, body, headers
):
    response = anonymous_client.post(QUERY_URL, json=body, headers=headers)

    assert response.status_code == 401
    assert response.headers["X-Auth-Error"] == "missing_token"
    assert response.headers["WWW-Authenticate"] == "Bearer"


def test_an_expired_token_is_distinguishable_from_a_bad_one(
    anonymous_client, body
):
    """
    The single most important distinction this endpoint draws.

    Access tokens live 15 minutes and a chat outlasts that, so the app has to
    be able to tell "refresh and retry silently" from "your session is over".
    It reads `X-Auth-Error` to do it; `invalid_token` here would strand a
    signed-in user at a login screen every quarter of an hour.
    """

    expired = make_token(expires_in=-60)

    response = anonymous_client.post(
        QUERY_URL, json=body, headers=bearer(expired)
    )

    assert response.status_code == 401
    assert response.headers["X-Auth-Error"] == "token_expired"


def test_a_token_signed_with_the_wrong_secret_is_refused(
    anonymous_client, body
):
    """The two services disagreeing on the secret must not fail open."""

    forged = make_token(secret="not-the-shared-secret-but-still-32-bytes")

    response = anonymous_client.post(
        QUERY_URL, json=body, headers=bearer(forged)
    )

    assert response.status_code == 401
    assert response.headers["X-Auth-Error"] == "invalid_token"


def test_an_unsigned_token_is_refused(anonymous_client, body):
    """
    The `alg: none` forgery: a token with a valid-looking payload and no
    signature at all. PyJWT honours the token's own `alg` header unless the
    caller pins the list, so this is a real hole if the decoder is written
    carelessly, and the endpoint would be trivially bypassable.
    """

    unsigned = jwt.encode(
        {"id": "attacker", "exp": int(time.time()) + 900},
        key="",
        algorithm="none",
    )

    response = anonymous_client.post(
        QUERY_URL, json=body, headers=bearer(unsigned)
    )

    assert response.status_code == 401
    assert response.headers["X-Auth-Error"] == "invalid_token"


def test_a_token_without_a_subject_is_refused(anonymous_client, body):
    """
    Correctly signed but not an access token — a refresh token sent where an
    access token belongs looks like this.
    """

    subjectless = make_token(user_id=None)

    response = anonymous_client.post(
        QUERY_URL, json=body, headers=bearer(subjectless)
    )

    assert response.status_code == 401
    assert response.headers["X-Auth-Error"] == "invalid_token"


def test_a_401_does_not_reach_the_pipeline(anonymous_client, body, pipeline):
    """
    Rejection has to happen before the expensive part, or an unauthenticated
    caller can still spend the LLM budget.
    """

    anonymous_client.post(QUERY_URL, json=body)

    assert pipeline.calls == []


def test_successful_query_returns_the_full_recommendation(client, body):
    response = client.post(QUERY_URL, json=body)

    assert response.status_code == 200

    data = response.json()

    assert data["reason"].startswith("Exertional")
    assert data["urgency"] == "urgent"
    assert data["medical_specialty"] == "Cardiology"
    assert data["specialty_code"] == "Cardiology"
    assert data["doctor_type"] == "Cardiologist"
    assert data["confidence"] == pytest.approx(0.82)

    specialist = data["nearby_specialists"][0]
    assert specialist["name"] == "Nemcare Superspeciality"
    assert specialist["maps_url"] == "https://maps.google.com/?cid=1"
    assert specialist["distance"] == pytest.approx(2.4)


def test_response_carries_a_traceable_request_id(client, body):
    response = client.post(QUERY_URL, json=body)

    assert response.json()["request_id"] == response.headers["X-Request-ID"]


def test_security_headers_are_present(client, body):
    response = client.post(QUERY_URL, json=body)

    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"
    assert response.headers["Referrer-Policy"] == "no-referrer"
    # These bodies describe symptoms and a location; they must not be cached.
    assert "no-store" in response.headers["Cache-Control"]


# ---------------------------------------------------------------------------
# Input validation
# ---------------------------------------------------------------------------

@pytest.mark.parametrize(
    "payload",
    [
        pytest.param({"query": "   "}, id="blank query"),
        pytest.param({"query": "x" * 5000}, id="over-long query"),
        pytest.param({"query": "headache", "language": "fr"}, id="unsupported language"),
        pytest.param(
            {"query": "headache", "latitude": 999, "longitude": 0},
            id="impossible latitude",
        ),
        pytest.param({"query": "headache", "is_admin": True}, id="unexpected field"),
    ],
)
def test_invalid_requests_are_rejected(client, payload):
    response = client.post(QUERY_URL, json=payload)

    assert response.status_code == 422
    assert "detail" in response.json()


def test_control_characters_are_stripped_from_the_question(client, pipeline):
    """
    Zero-width and control characters are how prompt-injection text gets
    hidden inside an innocent-looking question.
    """

    response = client.post(
        QUERY_URL,
        json={"query": "head​ache hurts"},
    )

    assert response.status_code == 200
    assert pipeline.calls[-1]["query"] == "headache hurts"


def test_location_is_optional(client, pipeline):
    """
    A user who declined the location permission still gets a recommendation -
    only the nearby-doctor list is missing.
    """

    response = client.post(QUERY_URL, json={"query": "my head hurts"})

    assert response.status_code == 200
    assert pipeline.calls[-1]["latitude"] is None
    assert pipeline.calls[-1]["longitude"] is None


# ---------------------------------------------------------------------------
# Rate limiting
#
# The budget is per account. It is what stops one signed-in user from
# spending everyone else's share of the LLM bill.
# ---------------------------------------------------------------------------

def test_a_caller_over_budget_gets_429_with_retry_after(client, body):
    codes = [
        client.post(QUERY_URL, json=body).status_code
        for _ in range(5)
    ]

    assert codes == [200, 200, 200, 429, 429]

    response = client.post(QUERY_URL, json=body)
    assert int(response.headers["Retry-After"]) >= 1


def test_the_budget_is_per_account_not_global(client, client_as, body):
    for _ in range(4):
        client.post(QUERY_URL, json=body)

    # A different account is unaffected by the first one running out.
    other = client_as("user-2")

    assert other.post(QUERY_URL, json=body).status_code == 200


# ---------------------------------------------------------------------------
# Failure handling
# ---------------------------------------------------------------------------

def test_a_pipeline_crash_does_not_leak_the_exception(client, body):
    """
    Tracebacks from this service carry API keys, Mongo URIs and upstream URLs.
    None of that may reach the caller.
    """

    import main
    from app.api.dependencies import get_application

    class Boom:
        def ask(self, **kwargs):
            raise RuntimeError("sk-live-SECRET-KEY and mongodb://user:pw@host")

    main.app.dependency_overrides[get_application] = lambda: Boom()

    response = client.post(QUERY_URL, json=body)

    assert response.status_code == 503
    assert "SECRET-KEY" not in response.text
    assert "mongodb://" not in response.text
    # Still traceable in the logs.
    assert response.json()["request_id"]


def test_health_endpoints(client):
    assert client.get("/health").status_code == 200
    assert client.get("/health/ready").json()["status"] == "ready"


def test_an_unknown_urgency_is_never_treated_as_an_emergency(client, body, pipeline):
    """
    The app shows the red banner and the ambulance button on `emergency`
    alone. A value outside the four known codes must fall back to the calm
    default rather than failing the response or alarming the user.
    """

    original = pipeline.ask

    def unknown_urgency(**kwargs):
        result = original(**kwargs)
        result["doctor"]["urgency"] = "VERY BAD"
        return result

    pipeline.ask = unknown_urgency

    response = client.post(QUERY_URL, json=body)

    assert response.status_code == 200
    assert response.json()["urgency"] == "routine"


# ---------------------------------------------------------------------------
# Configuration
#
# The endpoint may run open, but only deliberately and only outside
# production. These two tests are what keep "deliberately" true.
# ---------------------------------------------------------------------------

def test_without_a_secret_the_endpoint_runs_open(
    anonymous_client, body, monkeypatch
):
    """
    Unsetting JWT_SECRET drops authentication, for local work on the pipeline
    alone. `test_production_refuses_to_start_without_a_secret` is what stops
    that reaching a deploy.
    """

    monkeypatch.setattr(settings, "JWT_SECRET", None)
    # `auth_enabled` is a cached_property, so the memoised value has to go too.
    monkeypatch.delitem(settings.__dict__, "auth_enabled", raising=False)

    response = anonymous_client.post(QUERY_URL, json=body)

    assert response.status_code == 200


def test_production_refuses_to_start_without_a_secret():
    """
    An unauthenticated production deploy should be impossible to reach by
    forgetting something — the process must not come up at all.
    """

    insecure = Settings(
        ENVIRONMENT="production",
        JWT_SECRET=None,
        ALLOWED_HOSTS="api.cureliynk.com",
        ALLOWED_ORIGINS="https://cureliynk.com",
    )

    with pytest.raises(RuntimeError, match="JWT_SECRET"):
        insecure.validate_runtime_security()


def test_production_rejects_a_secret_that_is_too_short():
    """
    A short HMAC key is recoverable offline from a single captured token, so
    "set" is not the same as "safe".
    """

    weak = Settings(
        ENVIRONMENT="production",
        JWT_SECRET="short",
        ALLOWED_HOSTS="api.cureliynk.com",
        ALLOWED_ORIGINS="https://cureliynk.com",
    )

    with pytest.raises(RuntimeError, match="32 bytes"):
        weak.validate_runtime_security()


def test_production_starts_with_a_secret_and_real_allowlists():
    """The same config, correctly filled in, must not be rejected."""

    secure = Settings(
        ENVIRONMENT="production",
        JWT_SECRET="a-real-shared-secret-of-at-least-32-bytes",
        ALLOWED_HOSTS="api.cureliynk.com",
        ALLOWED_ORIGINS="https://cureliynk.com",
    )

    secure.validate_runtime_security()


def test_a_secret_containing_a_hash_is_refused():
    """
    The bug this guards against cost a debugging session once already.

    "#" starts an inline comment in a .env file, and Node's dotenv truncates
    the value there while python-dotenv keeps it. The two services then hold
    different keys from identical .env text, every signature fails, and the
    app reports an ended session on a perfectly good login. Rejected in every
    environment, not just production, because it breaks development first.
    """

    ambiguous = Settings(
        ENVIRONMENT="development",
        JWT_SECRET="cureliynk_jwt_super_secret_key_2024_@#$",
        ALLOWED_HOSTS="*",
        ALLOWED_ORIGINS="http://localhost:5173",
    )

    with pytest.raises(RuntimeError, match="#"):
        ambiguous.validate_runtime_security()
