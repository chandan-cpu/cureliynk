import { API_BASE_URL } from "@/lib/api-config";
import { clearTokens, getRefreshToken, saveAccessToken } from "@/lib/auth-storage";

/**
 * Keeps one login alive across both APIs.
 *
 * Access tokens are deliberately short-lived — `JWT_EXPIRES_IN` in
 * `server/.env` is 15 minutes — while the refresh token beside them is good
 * for a week. So the normal state of an app reopened after lunch is a dead
 * access token next to a perfectly valid refresh token, and every request
 * made in that state comes back 401.
 *
 * Both clients (`lib/api` for the Node API, `lib/medical-api` for the Python
 * one) call `refreshAccessToken()` when they see a 401 and replay the request
 * once with the token it returns. Only a refresh token the server itself
 * rejects ends the session and sends the user back to the login screen.
 */

/** How long to wait for the refresh call before giving up on it. */
const REFRESH_TIMEOUT_MS = 10000;

export type RefreshOutcome =
  /** A new access token is stored and ready to retry with. */
  | { status: "refreshed"; accessToken: string }
  /** The server rejected the refresh token. Tokens are cleared; sign in again. */
  | { status: "expired" }
  /** Couldn't ask (offline, 5xx). Stored tokens are untouched — retry later. */
  | { status: "unavailable" };

// ---------------------------------------------------------------------------
// Session-ended notifications
// ---------------------------------------------------------------------------

const listeners = new Set<() => void>();

/**
 * Subscribes to "this session is over".
 *
 * The refresh happens deep inside a request, far from any screen, so the auth
 * provider listens here and flips its status — that unmounts the protected
 * stack and lands the user on login, instead of leaving them on a signed-in
 * screen where nothing works.
 *
 * @returns an unsubscribe function.
 */
export function onSessionExpired(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

async function endSession(): Promise<void> {
  await clearTokens();
  // A copy, so a listener that unsubscribes itself can't disturb the walk.
  for (const listener of [...listeners]) listener();
}

// ---------------------------------------------------------------------------
// Refresh
// ---------------------------------------------------------------------------

let inFlight: Promise<RefreshOutcome> | null = null;

/**
 * Trades the stored refresh token for a new access token.
 *
 * Concurrent callers share one round trip: a screen that fires several
 * requests at once would otherwise send several identical refreshes and race
 * each other writing the result to storage.
 */
export function refreshAccessToken(): Promise<RefreshOutcome> {
  inFlight ??= performRefresh().finally(() => {
    inFlight = null;
  });

  return inFlight;
}

async function performRefresh(): Promise<RefreshOutcome> {
  const refreshToken = await getRefreshToken();

  if (!refreshToken) {
    // Nothing to refresh with — there is no way back from here without a
    // fresh login, so treat it exactly like a rejected refresh token.
    await endSession();
    return { status: "expired" };
  }

  let response: Response;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REFRESH_TIMEOUT_MS);
    try {
      response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  } catch {
    // Offline, or the API is unreachable. The stored tokens may well still be
    // valid, so this must never sign anyone out.
    return { status: "unavailable" };
  }

  // A proxy error page is HTML, not the `{ success, message, data }` envelope.
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  const accessToken = (payload as { data?: { accessToken?: string } } | null)?.data?.accessToken;

  if (response.ok && accessToken) {
    await saveAccessToken(accessToken);
    return { status: "refreshed", accessToken };
  }

  // 401 is an expired or revoked refresh token, 403 a deactivated account.
  // Those are the only answers that mean "this login is over"; a 500 or a
  // truncated body just means we couldn't find out.
  if (response.status === 401 || response.status === 403) {
    await endSession();
    return { status: "expired" };
  }

  return { status: "unavailable" };
}

/** Test seam: drops the shared in-flight request between cases. */
export function resetRefreshStateForTests(): void {
  inFlight = null;
  listeners.clear();
}
