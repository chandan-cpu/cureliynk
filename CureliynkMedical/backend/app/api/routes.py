"""
Medical API routes.

One endpoint: a symptom description in, a specialty / urgency / nearby-doctor
recommendation out.

Sign-in is not this service's job — the Node API owns accounts, tokens and
sessions, and nothing here reads an `Authorization` header. What is left is
rate limiting, validation, and never echoing an internal failure back to the
caller.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.api.rate_limit import enforce_rate_limit
from app.api.schemas import (
    ErrorResponse,
    MedicalQueryRequest,
    MedicalQueryResponse,
)
from app.api.dependencies import get_application
from app.services.application import MedicalApplication


logger = logging.getLogger(__name__)


router = APIRouter(
    prefix="/api/v1/medical",
    tags=["Medical Assistant"],
)


# Used when the router could not produce a recommendation at all. Sending a
# safe, conservative referral is better than sending the user nothing.
FALLBACK_SPECIALTY = "General Medicine"

FALLBACK_DOCTOR_TYPE = "General Physician / Internist"

FALLBACK_REASON = (
    "Initial medical evaluation is appropriate."
)

ALLOWED_URGENCY = {"routine", "soon", "urgent", "emergency"}


def _safe_urgency(value) -> str:
    """
    Narrow the router's urgency to a value the response model accepts.

    Defaults to "routine": an unrecognised value must never be promoted to an
    emergency, and must never suppress one that was correctly reported.
    """

    normalized = str(value or "").strip().lower()

    return normalized if normalized in ALLOWED_URGENCY else "routine"


@router.post(
    "/query",
    response_model=MedicalQueryResponse,
    status_code=status.HTTP_200_OK,
    summary="Recommend a medical specialty and nearby doctors",
    # Declared here rather than as a parameter because the endpoint has no use
    # for its return value, and because router-level dependencies resolve
    # first — a caller over budget is turned away before the pipeline is
    # touched.
    dependencies=[Depends(enforce_rate_limit)],
    responses={
        422: {"model": ErrorResponse, "description": "Invalid request"},
        429: {"model": ErrorResponse, "description": "Too many requests"},
        503: {"model": ErrorResponse, "description": "Assistant unavailable"},
    },
)
def medical_query(
    request: Request,
    payload: MedicalQueryRequest,
    application: MedicalApplication = Depends(get_application),
):
    """
    Process a medical question and determine the appropriate medical
    specialty, doctor type, urgency, and nearby specialists.

    Latitude and longitude are optional. Without them the recommendation is
    still returned; only `nearby_specialists` comes back empty.
    """

    request_id = getattr(request.state, "request_id", None)

    # A sync endpoint, so FastAPI runs this on a worker thread and the event
    # loop stays free while the pipeline does its blocking model and LLM work.
    try:
        result = application.ask(
            query=payload.query,
            latitude=payload.latitude,
            longitude=payload.longitude,
            language=payload.language,
        )

    except ValueError as error:
        # Raised by the pipeline for input it refuses to process. The message
        # is ours, not a library's, so it is safe to pass through.
        raise HTTPException(
            # Spelled out rather than using the status constant, whose name
            # changed between Starlette versions.
            status_code=422,
            detail=str(error),
        )

    except Exception:
        # Never surface the underlying exception: these messages routinely
        # carry API keys, upstream URLs and connection strings.
        logger.exception(
            "Medical query failed [request_id=%s]",
            request_id,
        )

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "The medical assistant is temporarily unavailable. "
                "Please try again in a moment."
            ),
        )

    doctor = result.get("doctor") or {}

    return MedicalQueryResponse(
        query=payload.query,

        medical_specialty=doctor.get("medical_specialty")
        or FALLBACK_SPECIALTY,

        # Canonical English specialty, never translated, so clients can map
        # the answer onto their own department lists regardless of language.
        specialty_code=doctor.get("medical_specialty_code")
        or doctor.get("medical_specialty")
        or FALLBACK_SPECIALTY,

        doctor_type=doctor.get("doctor_type")
        or FALLBACK_DOCTOR_TYPE,

        # Coerced rather than trusted: an urgency outside the four known
        # codes would fail response validation and turn a usable answer into
        # a 500.
        urgency=_safe_urgency(doctor.get("urgency")),

        reason=doctor.get("reason") or FALLBACK_REASON,

        confidence=doctor.get("confidence") or 0.0,

        nearby_specialists=result.get("nearby_specialists") or [],

        request_id=request_id,
    )
