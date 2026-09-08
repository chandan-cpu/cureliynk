"""
Request and response contracts for the medical API.

These models are the trust boundary: everything that reaches the pipeline has
already been shape-checked, length-capped and stripped of control characters
here, and everything that leaves has been narrowed to fields the clients are
meant to see.
"""

import re
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.config.settings import settings


# The four urgency levels the router is allowed to return
# (see app/core/doctor_router.py). Kept as machine-readable codes and never
# translated, because the mobile app switches its emergency UI on this value.
Urgency = Literal["routine", "soon", "urgent", "emergency"]


SupportedLanguage = Literal["en", "hi", "bn", "as"]


# Anything in the C0/C1 control ranges except tab and newline. Strips the
# zero-width and bidi-override characters used to hide prompt-injection text
# inside an otherwise innocent-looking question.
_CONTROL_CHARACTERS = re.compile(
    r"[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f-\x9f\u200b-\u200f\u2028-\u202e\ufeff]"
)


class MedicalQueryRequest(BaseModel):

    model_config = ConfigDict(
        # A client that sends an unexpected field is either out of date or
        # probing; either way, say so rather than silently ignoring it.
        extra="forbid",
        str_strip_whitespace=True,
    )

    query: str = Field(
        ...,
        min_length=1,
        max_length=settings.MAX_QUERY_CHARS,
        description="Medical question from the user",
    )

    # Optional on purpose: a user who declined the location permission still
    # gets a specialty and an urgency, just without the nearby-doctor list.
    latitude: float | None = Field(
        default=None,
        ge=-90,
        le=90,
        description="User's latitude, if location was shared",
    )

    longitude: float | None = Field(
        default=None,
        ge=-180,
        le=180,
        description="User's longitude, if location was shared",
    )

    language: SupportedLanguage = "en"

    @field_validator("query")
    @classmethod
    def _clean_query(cls, value: str) -> str:
        cleaned = _CONTROL_CHARACTERS.sub("", value).strip()

        if not cleaned:
            raise ValueError(
                "Please describe your symptoms."
            )

        return cleaned


class NearbySpecialist(BaseModel):
    """
    One suggested provider.

    `distance` and the coordinates are absent for results that came from the
    local doctor database rather than a maps search, so the clients must treat
    every optional field here as genuinely optional.
    """

    name: str

    speciality: str

    doctor_type: str

    distance: float | None = None

    location: str

    latitude: float | None = None

    longitude: float | None = None

    maps_url: str | None = None

    place_id: str | None = None


class MedicalQueryResponse(BaseModel):

    query: str

    # Display value: translated into the requested language.
    medical_specialty: str

    # The same specialty, always in canonical English. Clients map the answer
    # onto their own department lists with this one, so a Hindi or Assamese
    # response still routes to the right doctor search.
    specialty_code: str

    doctor_type: str

    urgency: Urgency

    # Why this specialty was chosen, in the requested language. This is the
    # text the mobile chat screen shows as the assistant's reply.
    reason: str

    confidence: float = Field(ge=0.0, le=1.0)

    nearby_specialists: list[NearbySpecialist] = Field(
        default_factory=list
    )

    # Echoed from X-Request-ID so a user can report a bad answer without
    # anyone having to repeat what they asked.
    request_id: str | None = None


class ErrorResponse(BaseModel):
    """The body every failure returns, documented so clients can rely on it."""

    detail: str

    request_id: str | None = None
