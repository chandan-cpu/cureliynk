import { medicalRequest, MedicalApiError } from "@/lib/medical-api";
import { resetRefreshStateForTests } from "@/lib/session";

const mockGetAccessToken = jest.fn();
const mockGetRefreshToken = jest.fn();
const mockSaveAccessToken = jest.fn();
const mockClearTokens = jest.fn();

jest.mock("@/lib/auth-storage", () => ({
  getAccessToken: () => mockGetAccessToken(),
  getRefreshToken: () => mockGetRefreshToken(),
  saveAccessToken: (token: string) => mockSaveAccessToken(token),
  clearTokens: () => mockClearTokens(),
}));

/** Builds a `fetch` reply with the headers the backend actually sends. */
function reply(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => headers[name] ?? null },
    json: async () => body,
  } as unknown as Response;
}

const originalFetch = global.fetch;

describe("medicalRequest", () => {
  beforeEach(() => {
    mockGetAccessToken.mockReset().mockResolvedValue("a-valid-token");
    mockGetRefreshToken.mockReset().mockResolvedValue("a-valid-refresh-token");
    mockSaveAccessToken.mockReset().mockResolvedValue(undefined);
    mockClearTokens.mockReset().mockResolvedValue(undefined);
    // The refresh is shared across callers, so it has to be dropped between
    // cases or the second test would reuse the first one's round trip.
    resetRefreshStateForTests();
    global.fetch = jest.fn();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("sends the bearer token and returns the parsed body", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(reply(200, { urgency: "routine" }));

    const result = await medicalRequest("/api/v1/medical/query", { query: "hi" });

    expect(result).toEqual({ urgency: "routine" });

    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain("/api/v1/medical/query");
    expect(init.headers.Authorization).toBe("Bearer a-valid-token");
    expect(JSON.parse(init.body)).toEqual({ query: "hi" });
  });

  it("fails without a round trip when there is nothing to sign in with", async () => {
    mockGetAccessToken.mockResolvedValue(null);
    mockGetRefreshToken.mockResolvedValue(null);

    await expect(medicalRequest("/x", {})).rejects.toMatchObject({
      status: 401,
      authError: "missing_token",
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("refreshes instead of failing when only the access token is gone", async () => {
    // An app reopened after a while: the 15-minute access token is long dead,
    // the week-long refresh token beside it is fine. That must not cost a login.
    mockGetAccessToken.mockResolvedValue(null);
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(reply(200, { success: true, data: { accessToken: "fresh" } }))
      .mockResolvedValueOnce(reply(200, { urgency: "routine" }));

    await expect(medicalRequest("/x", {})).resolves.toEqual({ urgency: "routine" });

    const [, init] = (global.fetch as jest.Mock).mock.calls[1];
    expect(init.headers.Authorization).toBe("Bearer fresh");
  });

  it("surfaces the backend's own message on a failure", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      reply(429, { detail: "Please wait a moment and try again." }, { "Retry-After": "17" }),
    );

    await expect(medicalRequest("/x", {})).rejects.toMatchObject({
      status: 429,
      message: "Please wait a moment and try again.",
      retryAfterSeconds: 17,
    });
  });

  it("renews an aged-out access token and replays the question", async () => {
    // The regression this guards: a 15-minute token expiring mid-conversation
    // used to surface as "your session has ended" on a perfectly live login.
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(
        reply(401, { detail: "Your session has expired." }, { "X-Auth-Error": "token_expired" }),
      )
      .mockResolvedValueOnce(reply(200, { success: true, data: { accessToken: "fresh" } }))
      .mockResolvedValueOnce(reply(200, { urgency: "soon" }));

    await expect(medicalRequest("/x", {})).resolves.toEqual({ urgency: "soon" });

    expect(mockSaveAccessToken).toHaveBeenCalledWith("fresh");
    const [, replayInit] = (global.fetch as jest.Mock).mock.calls[2];
    expect(replayInit.headers.Authorization).toBe("Bearer fresh");
  });

  it("only reports an ended session once the refresh token is rejected too", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(
        reply(401, { detail: "Your session has expired." }, { "X-Auth-Error": "token_expired" }),
      )
      .mockResolvedValueOnce(reply(401, { success: false, message: "Refresh token has expired." }));

    await expect(medicalRequest("/x", {})).rejects.toMatchObject({
      status: 401,
      authError: "token_expired",
    });

    // Dead tokens are cleared so the app stops pretending to be signed in.
    expect(mockClearTokens).toHaveBeenCalled();
  });

  it("does not sign the user out when the refresh call cannot be made", async () => {
    // Offline is not an expired session: the stored tokens may be perfectly
    // good, and throwing them away would force a needless login.
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(reply(401, { detail: "Expired" }, { "X-Auth-Error": "token_expired" }))
      .mockRejectedValueOnce(new TypeError("Network request failed"));

    await expect(medicalRequest("/x", {})).rejects.toMatchObject({ status: 401 });
    expect(mockClearTokens).not.toHaveBeenCalled();
  });

  it("keeps the request id from a failed call", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      reply(503, { detail: "Unavailable" }, { "X-Request-ID": "req-42" }),
    );

    const error = await medicalRequest("/x", {}).catch((thrown: unknown) => thrown);

    expect((error as MedicalApiError).requestId).toBe("req-42");
    // No Retry-After header means no wait to report, not a wait of zero.
    expect((error as MedicalApiError).retryAfterSeconds).toBeUndefined();
  });

  it("still reports a useful error when the body is not JSON", async () => {
    // A proxy 502 returns an HTML page, not the backend's error shape.
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 502,
      headers: { get: () => null },
      json: async () => {
        throw new SyntaxError("Unexpected token <");
      },
    } as unknown as Response);

    await expect(medicalRequest("/x", {})).rejects.toMatchObject({
      status: 502,
      message: "The assistant is unavailable right now. Please try again shortly.",
    });
  });

  it("turns a network failure into a MedicalApiError", async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new TypeError("Network request failed"));

    const error = await medicalRequest("/x", {}).catch((thrown: unknown) => thrown);

    expect(error).toBeInstanceOf(MedicalApiError);
    expect((error as MedicalApiError).status).toBe(0);
  });

  it("lets a caller-requested abort through untouched", async () => {
    // The chat screen tells "the user pressed stop" apart from "the network
    // died" by the error type, so an abort must not be rewritten.
    const controller = new AbortController();
    controller.abort();

    const abortError = new Error("Aborted");
    abortError.name = "AbortError";
    (global.fetch as jest.Mock).mockRejectedValue(abortError);

    const error = await medicalRequest("/x", {}, { signal: controller.signal }).catch(
      (thrown: unknown) => thrown,
    );

    expect(error).not.toBeInstanceOf(MedicalApiError);
    expect((error as Error).name).toBe("AbortError");
  });
});
