# CureLiynk medical assistant (FastAPI)

The AI service behind the **Ask AI** chat screen in the mobile app. A user
describes their symptoms; this service decides which medical specialty should
see them, how urgent it looks, why, and which doctors are nearby.

It is a separate service from the Node API in `server/`. The mobile app talks
to both directly, using **one login** for both.

```
Expo app (mobile/)
   │
   ├── Node API      :5000   auth, users, doctor search
   │      └─ owns sign-in: accounts, tokens, sessions
   │
   └── this service  :8000   the Ask AI chat
          └─ mints no tokens; verifies the Node API's with the shared secret
```

The Node API is the only one that can issue a token; this service verifies the
token it is handed, using the same `JWT_SECRET`. That is what "one login" means
in practice — the app signs in once against the Node API, and the same bearer
token is accepted here.

---

## Setup

### 1. Install

```bash
cd CureliynkMedical/backend
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r ../../requirements.txt
pip install pytest              # only needed to run the tests
```

### 2. Configure

```bash
cp .env.example .env
```

Fill it in — the AI provider keys and `GOOGLE_MAPS_API_KEY` are what the
pipeline cannot start without.

`JWT_SECRET` must be copied verbatim from the Node API's `.env`. That single
value is what lets a user sign in once and be recognised by both services;
without it here, this one cannot verify anything and refuses every request.

### 3. Run

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

`--host 0.0.0.0` matters for testing on a phone — `localhost` is only
reachable from the machine itself.

Startup loads the embedding model, the reranker and the BM25 index before the
port starts accepting traffic, so the first question is not stuck behind a
multi-minute model load. Watch for `Medical pipeline ready.` in the log.

### 4. Point the app at it

In `mobile/.env`:

```
EXPO_PUBLIC_MEDICAL_API_BASE_URL=http://<your machine's LAN IP>:8000
```

Use the same IP you already use for `EXPO_PUBLIC_API_BASE_URL`. A physical
device cannot reach `localhost` on your computer.

---

## The endpoint

### `POST /api/v1/medical/query`

Requires an access token from the Node API:

```
Authorization: Bearer <token>
```

The Node API signs it, this service verifies it, and both read the same
`JWT_SECRET` — so that one value has to be identical in both services' `.env`.
Get it wrong and both still start; every medical request just comes back 401.

Every 401 carries an `X-Auth-Error` header saying which kind it is, because
the app treats them differently:

| `X-Auth-Error`  | Means                              | What the app does        |
| --------------- | ---------------------------------- | ------------------------ |
| `missing_token` | No usable `Authorization` header   | Sends the user to log in |
| `token_expired` | Signature good, 15 minutes elapsed | Refreshes, retries once  |
| `invalid_token` | Bad signature, or not our shape    | Sends the user to log in |

`token_expired` is routine, not exceptional — access tokens outlive a chat
session far less often than the reverse.

Leaving `JWT_SECRET` unset drops authentication entirely, for working on the
pipeline alone; the log says so on every request, and production refuses to
start that way.

```jsonc
// request
{
  "query": "my chest feels tight when I climb stairs",
  "latitude": 26.14,     // optional
  "longitude": 91.73,    // optional
  "language": "en"       // en | hi | bn | as
}
```

```jsonc
// 200
{
  "query": "my chest feels tight when I climb stairs",
  "medical_specialty": "Cardiology",       // translated, for display
  "specialty_code": "Cardiology",          // always English, for matching
  "doctor_type": "Cardiologist",           // translated
  "urgency": "urgent",                     // routine | soon | urgent | emergency
  "reason": "Exertional chest tightness…", // translated; this is the chat reply
  "confidence": 0.82,
  "nearby_specialists": [
    {
      "name": "Nemcare Superspeciality",
      "speciality": "Cardiology",
      "doctor_type": "cardiologist",
      "distance": 2.4,                     // km, null for local-database results
      "location": "Bhangagarh, Guwahati",
      "latitude": 26.15,
      "longitude": 91.77,
      "maps_url": "https://maps.google.com/…",   // may be null
      "place_id": "…"                            // may be null
    }
  ],
  "request_id": "3f2a91c4b8e07d16"
}
```

Two fields are load-bearing for the app and must not be translated:

* **`urgency`** stays a code. The app shows the red banner and the ambulance
  button only when it reads exactly `"emergency"`.
* **`specialty_code`** stays English. The app maps it to a department for the
  "show all nearby" doctor search, so a Hindi answer still routes correctly.

**Location is optional.** Without coordinates the user still gets a specialty,
an urgency and a reason — only `nearby_specialists` comes back empty.

### Errors

Every failure returns the same shape:

```jsonc
{ "detail": "a message written for the user", "request_id": "3f2a91c4b8e07d16" }
```

| Status | Meaning | What the app does |
|---|---|---|
| 422 | The question failed validation | Shows the message, no retry |
| 429 | Over the rate limit. `Retry-After` in seconds. | Asks the user to wait |
| 503 | Pipeline failed or still loading | Offers a retry |

### Health

| Route | Purpose |
|---|---|
| `GET /health` | Liveness. Says nothing about the config or the models. |
| `GET /health/ready` | 200 once the models are loaded, 503 while loading. Hold traffic on this. |

---

## Security

What this service does:

* **Authentication.** Every request must carry an access token the Node API
  signed, verified here with the shared `JWT_SECRET`. The accepted algorithm
  is pinned to HS256, so a token asking to be verified with `alg: none` is
  rejected rather than trusted.
* **Rate limiting.** Per account, with `Retry-After`. Each request costs an
  embedding pass, a rerank and a paid LLM call, so this is a bill control as
  much as an abuse control. Keyed on the account rather than the address, so
  one heavy user does not throttle everyone behind the same carrier gateway.
* **Input validation.** Length cap, unknown fields rejected, coordinate ranges
  checked, control and zero-width characters stripped — those are how
  prompt-injection text gets hidden inside an innocent-looking question.
* **No leaked internals.** Tracebacks here carry API keys, Mongo URIs and
  upstream URLs. Callers get a generic message plus a request id; the real
  error goes to the log.
* **No health data in logs.** Symptom text, coordinates and client addresses
  are never logged. Access lines carry a request id; the rate-limit warning
  carries a hashed pseudonym of the address instead of the address itself.
* **Response headers.** `nosniff`, `DENY`, `no-referrer`, and `no-store` —
  these bodies describe someone's symptoms and location and must not be
  cached.
* **Fails closed.** The service refuses to start if a production config is
  missing `JWT_SECRET`, carries one shorter than 32 bytes, or still has a
  wildcard host or origin.

What it deliberately does **not** do: manage accounts. It verifies tokens; it
cannot issue, refresh or revoke one. A user who must be locked out is locked
out at the Node API, and this service keeps honouring their existing access
token until it expires — at most 15 minutes.

Still on you before this is public:

1. **Keep the port restricted anyway.** A token check is not a substitute for
   a network boundary: unauthenticated traffic still reaches the process, and
   any signed-in user can spend LLM budget up to their rate limit. Prefer a
   private network with the Node API in front of it.
2. **Terminate TLS.** Put it behind a reverse proxy with a real certificate —
   these requests carry someone's symptoms and location. Run it with
   `--proxy-headers --forwarded-allow-ips=<proxy ip>` so the rate limiter sees
   real client addresses rather than the proxy's.
3. **Set `ENVIRONMENT=production`**, a real `ALLOWED_HOSTS`, and a real
   `ALLOWED_ORIGINS`. This hides `/docs` and enables HSTS.
4. **Rate limits are per process.** The counters live in this process's
   memory, which is correct for one Uvicorn worker. With more than one worker
   or instance, each enforces its own share of the budget — move the window
   into Redis at that point.
5. **Rotate any key that has been committed.** `backend/.env` at the repo root
   was committed with live keys in it.

---

## Tests

```bash
cd CureliynkMedical/backend
pytest
```

17 tests covering the response contract, input validation, rate limiting and
the guarantee that a crash does not leak the exception. The pipeline is stubbed,
so they need no GPU, no Pinecone index and no paid API calls.

---

## Note on the duplicate

`backend/` at the repo root is an **older copy** of this service — it still
uses ChromaDB where this one uses Pinecone, and it has a committed `.env`. The
changes described here were made in `CureliynkMedical/backend` only. Delete the
root copy once you have confirmed nothing depends on it, and rotate the keys
that were committed inside it.
