"""
Cross-cutting HTTP middleware: request identity, access logging, and the
response headers every endpoint should carry.
"""

import logging
import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.config.settings import settings


logger = logging.getLogger("app.access")


REQUEST_ID_HEADER = "X-Request-ID"


class RequestContextMiddleware(BaseHTTPMiddleware):
    """
    Tags every request with an id and writes one access log line for it.

    The id is echoed back in `X-Request-ID` and included in error bodies, so
    a user can report "request 3f2a…" and it can be found in the logs without
    anyone having to store or repeat what they asked about.

    Deliberately absent from the log line: the query text, the coordinates and
    the caller's address. A symptom description plus a location is health data
    about an identifiable person, and log files are the easiest place to leak
    it from.
    """

    async def dispatch(self, request: Request, call_next):
        request_id = uuid.uuid4().hex[:16]

        request.state.request_id = request_id

        started = time.perf_counter()

        try:
            response: Response = await call_next(request)

        except Exception:
            duration_ms = (time.perf_counter() - started) * 1000

            logger.exception(
                "%s %s failed after %.0fms [request_id=%s]",
                request.method,
                request.url.path,
                duration_ms,
                request_id,
            )

            raise

        duration_ms = (time.perf_counter() - started) * 1000

        logger.info(
            "%s %s -> %s in %.0fms [request_id=%s]",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
            request_id,
        )

        response.headers[REQUEST_ID_HEADER] = request_id

        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Baseline hardening headers for a JSON API."""

    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)

        # Stop a browser from re-interpreting a JSON body as HTML/JS.
        response.headers.setdefault(
            "X-Content-Type-Options",
            "nosniff",
        )

        # Nothing here is meant to be framed.
        response.headers.setdefault("X-Frame-Options", "DENY")

        # Never leak the API path (or a query string) to a third-party site.
        response.headers.setdefault(
            "Referrer-Policy",
            "no-referrer",
        )

        response.headers.setdefault(
            "Permissions-Policy",
            "geolocation=(), camera=(), microphone=()",
        )

        # Responses describe someone's symptoms and location. Keep them out
        # of shared caches and off disk.
        response.headers.setdefault(
            "Cache-Control",
            "no-store, no-cache, must-revalidate, private",
        )

        response.headers.setdefault("Pragma", "no-cache")

        if settings.is_production:
            # Only meaningful over TLS, and harmful if set while still
            # serving plain HTTP in development.
            response.headers.setdefault(
                "Strict-Transport-Security",
                "max-age=31536000; includeSubDomains",
            )

        return response
