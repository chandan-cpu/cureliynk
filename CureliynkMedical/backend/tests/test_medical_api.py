"""
Contract and hardening tests for POST /api/v1/medical/query.

The mobile app talks to this endpoint directly, so what is asserted here is
mostly what it refuses to do. Sign-in is not among them: accounts and tokens
belong to the Node API, and this service asks the caller for nothing.
"""

import pytest

from tests.conftest import QUERY_URL


# ---------------------------------------------------------------------------
# The answer
# ---------------------------------------------------------------------------

def test_a_query_needs_no_credentials(client, body):
    """
    The endpoint is open by design — the Node API owns sign-in, and nothing
    here reads an `Authorization` header.
    """

    response = client.post(QUERY_URL, json=body)

    assert response.status_code == 200
    assert "WWW-Authenticate" not in response.headers


def test_an_authorization_header_is_ignored_rather_than_rejected(client, body):
    """
    App builds from before this service dropped authentication still send a
    bearer token. It must not turn into a 401 now that nobody verifies it.
    """

    response = client.post(
        QUERY_URL,
        json=body,
        headers={"Authorization": "Bearer not-a-jwt"},
    )

    assert response.status_code == 200


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
# With no account to key on, the budget is per client address. That is the
# only thing standing between an open endpoint and someone else's LLM bill.
# ---------------------------------------------------------------------------

def test_a_caller_over_budget_gets_429_with_retry_after(client, body):
    codes = [
        client.post(QUERY_URL, json=body).status_code
        for _ in range(5)
    ]

    assert codes == [200, 200, 200, 429, 429]

    response = client.post(QUERY_URL, json=body)
    assert int(response.headers["Retry-After"]) >= 1


def test_the_budget_is_per_address_not_global(client, client_from, body):
    for _ in range(4):
        client.post(QUERY_URL, json=body)

    # A different address is unaffected by the first one running out.
    other = client_from("203.0.113.7")

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
