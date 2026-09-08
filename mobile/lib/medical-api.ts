import { ApiError } from "@/lib/api";
import { MEDICAL_API_BASE_URL } from "@/lib/api-config";
import { getAccessToken } from "@/lib/auth-storage";
import { refreshAccessToken } from "@/lib/session";

/**
 * Client for the Python medical assistant (`CureliynkMedical/backend`).
 *
 * It is a second service, separate from the Node API in `lib/api.ts`: a
 * different base URL, a different response shape (plain JSON with a `detail`
 * string on errors, not the `{ success, message, data }` envelope), and a
 * much longer request budget, because a single answer runs a retrieval
 * pipeline and one or more LLM calls.
 *
 * What the two services share is the login: the access token minted by the
 * Node API is verified by the Python one with the same signing secret, so the
 * user signs in once and the same `Authorization: Bearer` header works on
 * both. It also means they share an expiry — see `lib/session` for how a
 * token that aged out is renewed rather than shown to the user as an error.
 */

/**
 * Generous on purpose. The backend has to embed the question, search the
 * knowledge base, rerank the results, call the routing model and — outside
 * English — translate the answer. Anything under about 45s cuts off answers
 * that were on their way.
 */
const MEDICAL_REQUEST_TIMEOUT_MS = 60000;

/** What the backend puts in `X-Auth-Error` when it rejects a token. */
export type AuthErrorCode = "missing_token" | "token_expired" | "invalid_token";

/** An `ApiError` carrying the extra context this service returns. */
export class MedicalApiError extends ApiError {
  /** Present on 401s — `token_expired` means the session can be refreshed. */
  authError?: AuthErrorCode;
  /** Seconds to wait, from the `Retry-After` header on a 429. */
  retryAfterSeconds?: number;
  /** The backend's `X-Request-ID`, worth quoting in a bug report. */
  requestId?: string;

  constructor(
    status: number,
    message: string,
    extra: { authError?: AuthErrorCode; retryAfterSeconds?: number; requestId?: string } = {},
  ) {
    super(status, message);
    this.name = "MedicalApiError";
    this.authError = extra.authError;
    this.retryAfterSeconds = extra.retryAfterSeconds;
    this.requestId = extra.requestId;
  }
}

type MedicalRequestOptions = {
  /** Lets the caller cancel — the chat screen wires this to its stop button. */
  signal?: AbortSignal;
};

/** The error body the backend returns for every failure. */
type ErrorBody = { detail?: string; request_id?: string };

function messageForStatus(status: number, detail: string | undefined): string {
  // Prefer the backend's own message: it is written for a patient to read and
  // is already in a sensible register. Fall back per status when a proxy or a
  // crash returned something that isn't ours.
  if (detail) return detail;
  if (status === 401) return "Please sign in again to use the assistant.";
  if (status === 429) return "Too many questions at once. Please wait a moment.";
  if (status >= 500) return "The assistant is unavailable right now. Please try again shortly.";
  return "Something went wrong. Please try again.";
}

/**
 * POSTs to the medical service and returns the parsed body.
 *
 * Throws `MedicalApiError` for every failure, including network ones, so
 * callers have a single error type to branch on.
 */
export async function medicalRequest<T>(
  path: string,
  body: unknown,
  { signal }: MedicalRequestOptions = {},
): Promise<T> {
  /** One POST, with its own timeout, wired to the caller's abort signal. */
  const attempt = async (bearer: string): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), MEDICAL_REQUEST_TIMEOUT_MS);

    // The caller's signal and our timeout both have to be able to abort the
    // request, and React Native has no `AbortSignal.any()`.
    const onCallerAbort = () => controller.abort();
    // A signal that is already aborted will never fire the event, so check it
    // as well as subscribing.
    if (signal?.aborted) controller.abort();
    else signal?.addEventListener("abort", onCallerAbort);

    try {
      return await fetch(`${MEDICAL_API_BASE_URL}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${bearer}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (error) {
      // An abort the caller asked for is not a failure — let it propagate so
      // the screen can tell "user pressed stop" apart from "the network died".
      if (signal?.aborted) throw error;

      throw new MedicalApiError(
        0,
        "Couldn't reach the assistant. Check your connection and try again.",
      );
    } finally {
      clearTimeout(timeoutId);
      signal?.removeEventListener("abort", onCallerAbort);
    }
  };

  let token = await getAccessToken();

  if (!token) {
    // No access token, but the refresh token stored beside it may still be
    // good — that is the ordinary state of an app reopened after a while, and
    // it should not cost the user a login.
    const outcome = await refreshAccessToken();
    if (outcome.status !== "refreshed") {
      // Fail here rather than sending an anonymous request the backend will
      // reject anyway — the caller gets the same error either way, without
      // the round trip.
      throw new MedicalApiError(401, "Please sign in to use the assistant.", {
        authError: "missing_token",
      });
    }
    token = outcome.accessToken;
  }

  let response = await attempt(token);

  // The access token expiring mid-conversation is by far the most common 401
  // here — the Node API mints them with a 15-minute life — and it is entirely
  // recoverable. Renew and ask again; only a refresh token the server rejects
  // reaches the user as "your session has ended".
  if (response.status === 401 && !signal?.aborted) {
    const outcome = await refreshAccessToken();
    if (outcome.status === "refreshed") response = await attempt(outcome.accessToken);
  }

  const requestId = response.headers.get("X-Request-ID") ?? undefined;

  // A 502 from a proxy, or a crash before the app's handlers run, returns
  // HTML rather than JSON.
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const { detail } = (payload ?? {}) as ErrorBody;

    // `Number(null)` is 0, which is finite — so the header has to be checked
    // for presence before it is parsed, or every error would claim a 0s wait.
    const retryAfterHeader = response.headers.get("Retry-After");
    const retryAfter = retryAfterHeader === null ? NaN : Number(retryAfterHeader);

    throw new MedicalApiError(response.status, messageForStatus(response.status, detail), {
      authError: (response.headers.get("X-Auth-Error") as AuthErrorCode | null) ?? undefined,
      retryAfterSeconds: Number.isFinite(retryAfter) ? retryAfter : undefined,
      requestId,
    });
  }

  return payload as T;
}
