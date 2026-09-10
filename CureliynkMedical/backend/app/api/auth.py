"""
Bearer-token verification.

This service does not mint tokens and knows nothing about passwords: the Node
API (`server/`) owns accounts, sign-in and refresh. What happens here is the
other half of that arrangement — an access token the Node API signed is
verified with the same secret, so the user signs in once and the same
`Authorization: Bearer` header works against both services.

The contract with the mobile client matters more than usual, because the app
recovers from one of these failures on its own. Every 401 carries an
`X-Auth-Error` header, and `mobile/lib/medical-api.ts` reads it:

    missing_token   no usable header — the user has to sign in
    token_expired   signature is good, the clock ran out — refresh and retry
    invalid_token   signature, shape or claims are wrong — do not retry

`token_expired` is the common one rather than the exceptional one. Access
tokens live 15 minutes and a chat session outlasts that easily, so a token
aging out mid-conversation must stay invisible to the user; returning
`invalid_token` for it would strand a signed-in user at a login screen.
"""

import logging
from dataclasses import dataclass

import jwt
from fastapi import HTTPException, Request, status

from app.config.settings import settings


logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class Principal:
    """The caller, as far as this service is concerned."""

    # `sub` by convention elsewhere, but the Node API signs `{ id, role, email }`
    # (see `server/src/utils/jwt.utils.js`), so `id` is what actually arrives.
    id: str

    role: str | None = None

    email: str | None = None


def _unauthorized(code: str, message: str) -> HTTPException:
    """
    A 401 the mobile client can act on.

    `WWW-Authenticate` is there because a 401 without it is malformed per
    RFC 9110; `X-Auth-Error` is the part the app actually branches on.
    """

    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=message,
        headers={
            "WWW-Authenticate": "Bearer",
            "X-Auth-Error": code,
        },
    )


def _bearer_token(request: Request) -> str | None:
    """The token out of `Authorization`, or None if there isn't a usable one."""

    header = request.headers.get("Authorization")

    if not header:
        return None

    scheme, _, token = header.partition(" ")

    # Case-insensitive: RFC 9110 defines the scheme that way, and clients do
    # send "bearer" lowercase.
    if scheme.lower() != "bearer":
        return None

    return token.strip() or None


def require_principal(request: Request) -> Principal | None:
    """
    Route dependency: verify the caller's token and return who they are.

    Returns `None` when `JWT_SECRET` is unset, which leaves the endpoint open
    for local work against the pipeline alone. That state cannot reach
    production — `Settings.validate_runtime_security` refuses to boot without
    a secret there — but it is loud in the log either way, because an open
    medical endpoint is not something to discover later.

    The verified principal is also stashed on `request.state` so the rate
    limiter can key its window on the account instead of the IP.
    """

    if not settings.auth_enabled:
        logger.warning(
            "JWT_SECRET is not set — %s %s served without authentication.",
            request.method,
            request.url.path,
        )

        return None

    token = _bearer_token(request)

    if token is None:
        raise _unauthorized(
            "missing_token",
            "Please sign in to use the assistant.",
        )

    try:
        claims = jwt.decode(
            token,
            settings.JWT_SECRET,
            # A list of exactly one. PyJWT will otherwise honour the algorithm
            # named in the token's own header, which lets a caller pick
            # "none" and hand us an unsigned token of their own writing.
            algorithms=[settings.JWT_ALGORITHM],
            # The Node API sets neither `aud` nor `iss`, so there is nothing
            # to check them against; `exp` is set and is verified by default.
            options={"require": ["exp"]},
        )

    except jwt.ExpiredSignatureError:
        # Expected, roughly every 15 minutes of an active chat. Not a warning.
        raise _unauthorized(
            "token_expired",
            "Your session expired. Signing you back in...",
        )

    except jwt.InvalidTokenError as error:
        # A bad signature is the interesting case — it means either a forgery
        # attempt or, far more often, the two services holding different
        # secrets. The reason is logged; the caller is told nothing that would
        # help them tune an attack.
        logger.warning(
            "Rejected a bearer token: %s",
            error.__class__.__name__,
        )

        raise _unauthorized(
            "invalid_token",
            "Please sign in again to use the assistant.",
        )

    subject = claims.get("id") or claims.get("sub")

    if not subject:
        # Correctly signed but not one of ours — the Node API always puts an
        # `id` in an access token. Most likely a refresh token being sent
        # where an access token belongs.
        logger.warning("Rejected a bearer token with no subject claim.")

        raise _unauthorized(
            "invalid_token",
            "Please sign in again to use the assistant.",
        )

    principal = Principal(
        id=str(subject),
        role=claims.get("role"),
        email=claims.get("email"),
    )

    request.state.principal = principal

    return principal
