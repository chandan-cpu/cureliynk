import { API_BASE_URL } from "@/lib/api-config";
import { getAccessToken } from "@/lib/auth-storage";
import { refreshAccessToken } from "@/lib/session";

const REQUEST_TIMEOUT_MS = 10000;

/** Mirrors the `{ success, message, errors }` shape every backend route returns. */
export class ApiError extends Error {
  status: number;
  errors?: unknown;

  constructor(status: number, message: string, errors?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

type ApiEnvelope<T> =
  | { success: true; message: string; data: T }
  | { success: false; message: string; errors?: unknown };

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  /** Attaches the stored access token as a Bearer header. */
  authenticated?: boolean;
};

export async function apiRequest<T = undefined>(
  path: string,
  { method = "GET", body, authenticated = false }: RequestOptions = {},
): Promise<T> {
  /** One attempt. `token` is null for public routes and for a missing token. */
  const send = async (token: string | null): Promise<Response> => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        return await fetch(`${API_BASE_URL}${path}`, {
          method,
          headers,
          body: body !== undefined ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }
    } catch {
      // Covers both an outright network failure (fetch rejects immediately)
      // and a connection that hangs with no response — e.g. a firewall or
      // NAT silently dropping packets instead of refusing the connection,
      // which would otherwise leave this Promise unsettled forever and hang
      // any caller waiting on it (like the auth bootstrap on app launch).
      throw new ApiError(0, "Couldn't reach the server. Check your connection and try again.");
    }
  };

  let response = await send(authenticated ? await getAccessToken() : null);

  // A 401 on an authenticated call is nearly always the 15-minute access
  // token ageing out mid-session, which is recoverable without involving the
  // user: swap it for a fresh one and replay the request once. Only when the
  // refresh token is itself rejected does the 401 reach the caller — and by
  // then `lib/session` has cleared the tokens and signed the user out.
  if (authenticated && response.status === 401) {
    const outcome = await refreshAccessToken();
    if (outcome.status === "refreshed") response = await send(outcome.accessToken);
  }

  const envelope = (await response.json()) as ApiEnvelope<T>;

  if (!envelope.success) {
    throw new ApiError(response.status, envelope.message, envelope.errors);
  }

  return envelope.data;
}
