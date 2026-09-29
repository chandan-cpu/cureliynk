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

# ===============================
# API ROUTES
# ===============================

from app.api.routes import router
from app.api.doctor_routes import router as doctor_router
from app.api.laboratory_routes import router as laboratory_router

# ===============================
# APPLICATION DEPENDENCIES
# ===============================

from app.api.dependencies import get_application

# ===============================
# MIDDLEWARE
# ===============================

from app.api.middleware import (
    RequestContextMiddleware,
    SecurityHeadersMiddleware,
)

# ===============================
# CONFIGURATION
# ===============================

from app.config.logging import configure_logging
from app.config.settings import settings


# ===============================
# LOGGING
# ===============================

configure_logging()

logger = logging.getLogger(__name__)


# ===============================
# APPLICATION LIFESPAN
# ===============================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Refuse to start on an insecure config, then load the models once.

    Warming the pipeline here instead of on the first request means the
    embedding model, the reranker and the BM25 index are in memory before
    the port accepts traffic.
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
        # Log it and keep serving: /health/ready reports unready and
        # requests fail with a clean 503.
        logger.exception(
            "Medical pipeline failed to load. The service will start but "
            "/api/v1/medical/query will return 503."
        )

    yield

    logger.info("Shutting down.")


# ===============================
# FASTAPI APPLICATION
# ===============================

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.API_VERSION,
    description=(
        "AI-powered medical care navigation assistant "
        "for identifying appropriate medical specialties "
        "and doctor types."
    ),
    lifespan=lifespan,

    # The schema names every route, field and error shape.
    # Handy in development, an inventory for an attacker in production.
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
# ===============================

app.add_middleware(RequestContextMiddleware)

app.add_middleware(SecurityHeadersMiddleware)

app.add_middleware(
    GZipMiddleware,
    minimum_size=1024,
)


# ===============================
# CORS
# ===============================

# Native mobile builds send no Origin header, so CORS never applies to them.
#
# This allowlist exists for the Vite web frontend and Expo web.
#
# `X-Auth-Error` has to be in `expose_headers` or a browser hides it from the
# page even on an allowed origin, and the web client loses the difference
# between "refresh the token and retry" and "send the user to sign in". Native
# builds read it regardless — this line is what makes Expo web behave the same.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
    expose_headers=["X-Request-ID", "Retry-After", "X-Auth-Error"],
    max_age=600,
)


# ===============================
# TRUSTED HOST
# ===============================

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=settings.allowed_hosts,
)


# ===============================
# ERROR HANDLERS
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
    input values are not.
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

    first = (
        errors[0]["message"]
        if errors
        else "Invalid request."
    )

    return JSONResponse(
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

    The real exception goes to the log with its request id; the caller gets
    a generic message.
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

# Existing medical routes
app.include_router(router)

# Doctor routes
#
# Example:
# POST /api/v1/doctors
#
app.include_router(doctor_router)

# Laboratory routes
#
# Example:
# GET /api/v1/medical/laboratories/nearby
#
app.include_router(laboratory_router)


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
    Liveness only - deliberately says nothing about the configuration
    or the models, since it is reachable without a token.
    """

    return {
        "status": "healthy"
    }


@app.get("/health/ready", tags=["Health"])
def readiness():
    """
    Readiness: has the pipeline finished loading?

    A load balancer should hold traffic until this returns 200, otherwise
    the first requests land while the models are still coming up.
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
        content={
            "status": "ready" if ready else "loading"
        },
    )