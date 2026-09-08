"""
AI Medical Assistant - HTTP entrypoint.

Run it with:

    uvicorn main:app --host 0.0.0.0 --port 8000

Behind a reverse proxy, add --proxy-headers and --forwarded-allow-ips=<proxy>
so the rate limiter sees real client addresses instead of the proxy's.
"""

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.api.dependencies import get_application
from app.api.middleware import (
    RequestContextMiddleware,
    SecurityHeadersMiddleware,
)
from app.api.routes import router
from app.config.logging import configure_logging
from app.config.settings import settings


configure_logging()

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Refuse to start on an insecure config, then load the models once.

    Warming the pipeline here instead of on the first request means the
    embedding model, the reranker and the BM25 index are in memory before the
    port accepts traffic - otherwise the first user to open the chat waits out
    a multi-minute model load and times out.
    """

    settings.validate_runtime_security()

    logger.info(
        "Loading medical pipeline (device=%s)...",
        settings.DEVICE,
    )

    try:
        # Blocking and slow, so it runs off the event loop.
        await asyncio.to_thread(get_application)

        logger.info("Medical pipeline ready.")

    except Exception:
        # Log it and keep serving: /health/ready reports unready and requests
        # fail with a clean 503, instead of the process crash-looping.
        logger.exception(
            "Medical pipeline failed to load. The service will start but "
            "/api/v1/medical/query will return 503."
        )

    yield

    logger.info("Shutting down.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.API_VERSION,
    description=(
        "AI-powered medical care navigation assistant "
        "for identifying appropriate medical specialties "
        "and doctor types."
    ),
    lifespan=lifespan,
    # The schema names every route, field and error shape. Handy in
    # development, an inventory for an attacker in production.
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None,
    openapi_url=None if settings.is_production else "/openapi.json",
)


# ===============================
# MIDDLEWARE
#
# Starlette makes the LAST one added the outermost, so a request travels:
#
#   TrustedHost -> CORS -> GZip -> SecurityHeaders -> RequestContext -> route
#
# which is the order that matters: the host check runs before any body is
# read, preflights are answered before anything expensive, and every response
# that reaches a route carries both the security headers and a request id.
# ===============================

app.add_middleware(RequestContextMiddleware)

app.add_middleware(SecurityHeadersMiddleware)

app.add_middleware(GZipMiddleware, minimum_size=1024)

# Native mobile builds send no Origin header, so CORS never applies to them.
# This allowlist exists for the Vite web frontend and Expo web; it stays an
# explicit list rather than a wildcard because a browser origin that can reach
# this endpoint can spend its LLM budget.
#
# `Authorization` is still allowed through: nothing here reads it, but clients
# built against the earlier authenticated version keep sending it, and a
# preflight that rejects the header would fail those requests outright.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
    expose_headers=["X-Request-ID", "Retry-After"],
    max_age=600,
)

# Rejects requests whose Host header is not one we serve, which is what stops
# DNS-rebinding and cache-poisoning tricks against a public deployment.
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=settings.allowed_hosts,
)


# ===============================
# ERROR HANDLERS
#
# Every failure returns the same JSON shape - a "detail" string plus the
# request id - so the clients only ever have to parse one thing.
# ===============================

def _request_id(request: Request) -> str | None:
    return getattr(request.state, "request_id", None)


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(
    request: Request,
    exc: StarletteHTTPException,
):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "request_id": _request_id(request),
        },
        headers=getattr(exc, "headers", None),
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError,
):
    """
    Turn Pydantic's error list into one readable sentence.

    The field/message pairs are echoed back for debugging, but the offending
    input values are not - those are the user's own symptom text, and there is
    no reason to bounce health data back through an error path.
    """

    errors = [
        {
            "field": ".".join(
                str(part)
                for part in error.get("loc", ())
                if part != "body"
            ),
            "message": error.get("msg", "Invalid value"),
        }
        for error in exc.errors()
    ]

    first = errors[0]["message"] if errors else "Invalid request."

    return JSONResponse(
        # Spelled out rather than using the status constant, whose name
        # changed between Starlette versions.
        status_code=422,
        content={
            "detail": first,
            "errors": errors,
            "request_id": _request_id(request),
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(
    request: Request,
    exc: Exception,
):
    """
    Last line of defence.

    The real exception goes to the log with its request id; the caller gets a
    generic message, because tracebacks from this service routinely carry API
    keys, Mongo connection strings and upstream URLs.
    """

    logger.exception(
        "Unhandled error on %s %s [request_id=%s]",
        request.method,
        request.url.path,
        _request_id(request),
    )

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "Something went wrong on our side.",
            "request_id": _request_id(request),
        },
    )


# ===============================
# ROUTES
# ===============================

app.include_router(router)


# ===============================
# HEALTH CHECKS
# ===============================

@app.get("/", tags=["Health"])
def root():
    return {
        "message": "AI Medical Assistant API is running",
        "version": settings.API_VERSION,
    }


@app.get("/health", tags=["Health"])
def health():
    """
    Liveness only - deliberately says nothing about the configuration or the
    models, since it is reachable without a token.
    """

    return {"status": "healthy"}


@app.get("/health/ready", tags=["Health"])
def readiness():
    """
    Readiness: has the pipeline finished loading?

    A load balancer should hold traffic until this returns 200, otherwise the
    first requests land while the models are still coming up.
    """

    # get_application is lru_cache'd, so a populated cache means the load
    # completed. Calling it here would block, so only the cache is inspected.
    ready = get_application.cache_info().currsize > 0

    return JSONResponse(
        status_code=(
            status.HTTP_200_OK
            if ready
            else status.HTTP_503_SERVICE_UNAVAILABLE
        ),
        content={"status": "ready" if ready else "loading"},
    )
