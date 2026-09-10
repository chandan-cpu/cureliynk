"""
Per-caller request budget.

Every medical query runs an embedding model, a cross-encoder reranker and at
least one paid LLM call, so an unthrottled endpoint is both a denial-of-service
target and a way to run up someone else's API bill.

The budget is keyed on the account when the caller presented a token, and on
the client address when they did not. The account key is the one that matters:
an address-keyed window puts everyone behind one NAT or one mobile carrier
gateway into a single budget, so a busy user throttles strangers. Size
`RATE_LIMIT_REQUESTS` for a shared address anyway — that is still the key in
use whenever `JWT_SECRET` is unset.

The counters live in this process's memory: correct and dependency-free for a
single Uvicorn worker, which is what this service runs today. Running more than
one worker or more than one instance means each of them enforces its own share
of the budget — move the window into Redis at that point.
"""

import hashlib
import logging
import threading
import time
from collections import defaultdict, deque

from fastapi import Depends, HTTPException, Request, status

from app.api.auth import Principal, require_principal
from app.config.settings import settings


logger = logging.getLogger(__name__)


class SlidingWindowLimiter:
    """Counts requests per key over a rolling time window."""

    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests

        self.window_seconds = window_seconds

        self._hits: dict[str, deque[float]] = defaultdict(deque)

        # Endpoints are sync `def`, so FastAPI runs them on a thread pool and
        # several can touch these counters at the same time.
        self._lock = threading.Lock()

        self._last_prune = 0.0

    def check(self, key: str) -> float | None:
        """
        Record a hit for `key`.

        Returns `None` when the request is within budget, or the number of
        seconds until the oldest hit falls out of the window when it is not.
        """

        now = time.monotonic()

        cutoff = now - self.window_seconds

        with self._lock:
            self._prune(now, cutoff)

            hits = self._hits[key]

            while hits and hits[0] <= cutoff:
                hits.popleft()

            if len(hits) >= self.max_requests:
                return max(
                    0.0,
                    hits[0] + self.window_seconds - now,
                )

            hits.append(now)

            return None

    def _prune(self, now: float, cutoff: float) -> None:
        """
        Drop keys that have gone quiet.

        Without this the dict grows once per distinct IP forever, which is a
        slow memory leak an attacker can drive on purpose. Called at most once
        per window; the caller already holds the lock.
        """

        if now - self._last_prune < self.window_seconds:
            return

        self._last_prune = now

        stale = [
            key
            for key, hits in self._hits.items()
            if not hits or hits[-1] <= cutoff
        ]

        for key in stale:
            del self._hits[key]


_limiter = SlidingWindowLimiter(
    max_requests=settings.RATE_LIMIT_REQUESTS,
    window_seconds=settings.RATE_LIMIT_WINDOW_SECONDS,
)


def _client_ip(request: Request) -> str:
    """
    Best-effort client address.

    `X-Forwarded-For` is only trusted when the app is actually behind a proxy
    that sets it — run Uvicorn with `--proxy-headers --forwarded-allow-ips`
    so Starlette rewrites `request.client` for us, rather than reading a
    header any caller can spoof.
    """

    return request.client.host if request.client else "unknown"


def _pseudonym(value: str) -> str:
    """
    A short, stable stand-in for a client address or account id, for logs.

    Either one identifies a person closely enough to matter when the requests
    beside it are medical questions, so the log gets a hash — enough to
    recognise the same caller twice while debugging, useless to anyone reading
    the log file.
    """

    return hashlib.sha256(
        value.encode("utf-8")
    ).hexdigest()[:12]


def enforce_rate_limit(
    request: Request,
    # Declared as a sub-dependency rather than relying on this running after
    # the route's other dependencies: it makes the ordering a fact of the
    # graph, so an unauthenticated caller is turned away before any budget is
    # spent on them, and a verified one is billed to their account.
    principal: Principal | None = Depends(require_principal),
) -> None:
    """Route dependency: 429s a caller that is over budget."""

    key = (
        f"user:{principal.id}"
        if principal is not None
        else f"ip:{_client_ip(request)}"
    )

    retry_after = _limiter.check(key)

    if retry_after is None:
        return

    logger.warning(
        "Rate limit hit by %s (%s requests / %ss).",
        _pseudonym(key),
        settings.RATE_LIMIT_REQUESTS,
        settings.RATE_LIMIT_WINDOW_SECONDS,
    )

    raise HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail=(
            "You're sending questions faster than we can answer them. "
            "Please wait a moment and try again."
        ),
        headers={"Retry-After": str(max(1, int(retry_after) + 1))},
    )
