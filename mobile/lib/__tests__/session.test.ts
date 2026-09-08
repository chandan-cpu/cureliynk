import {
  onSessionExpired,
  refreshAccessToken,
  resetRefreshStateForTests,
} from "@/lib/session";

const mockGetRefreshToken = jest.fn();
const mockSaveAccessToken = jest.fn();
const mockClearTokens = jest.fn();

jest.mock("@/lib/auth-storage", () => ({
  getAccessToken: jest.fn(),
  getRefreshToken: () => mockGetRefreshToken(),
  saveAccessToken: (token: string) => mockSaveAccessToken(token),
  clearTokens: () => mockClearTokens(),
}));

function reply(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

const originalFetch = global.fetch;

describe("refreshAccessToken", () => {
  beforeEach(() => {
    mockGetRefreshToken.mockReset().mockResolvedValue("stored-refresh-token");
    mockSaveAccessToken.mockReset().mockResolvedValue(undefined);
    mockClearTokens.mockReset().mockResolvedValue(undefined);
    resetRefreshStateForTests();
    global.fetch = jest.fn();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("exchanges the stored refresh token for a new access token", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      reply(200, { success: true, data: { accessToken: "fresh" } }),
    );

    await expect(refreshAccessToken()).resolves.toEqual({
      status: "refreshed",
      accessToken: "fresh",
    });

    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain("/api/v1/auth/refresh-token");
    expect(JSON.parse(init.body)).toEqual({ refreshToken: "stored-refresh-token" });
    // Only the access token is rotated — the refresh token stays put.
    expect(mockSaveAccessToken).toHaveBeenCalledWith("fresh");
  });

  it("shares one round trip between concurrent callers", async () => {
    // Two screens loading at once both hit a 401; they must not send two
    // refreshes and race each other writing the answer to storage.
    (global.fetch as jest.Mock).mockResolvedValue(
      reply(200, { success: true, data: { accessToken: "fresh" } }),
    );

    const [first, second] = await Promise.all([refreshAccessToken(), refreshAccessToken()]);

    expect(first).toEqual(second);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("ends the session when the refresh token is rejected", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      reply(401, { success: false, message: "Refresh token has expired." }),
    );

    const expired = jest.fn();
    onSessionExpired(expired);

    await expect(refreshAccessToken()).resolves.toEqual({ status: "expired" });
    expect(mockClearTokens).toHaveBeenCalled();
    expect(expired).toHaveBeenCalled();
  });

  it("ends the session for a deactivated account", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      reply(403, { success: false, message: "Account is deactivated." }),
    );

    await expect(refreshAccessToken()).resolves.toEqual({ status: "expired" });
    expect(mockClearTokens).toHaveBeenCalled();
  });

  it("keeps the stored tokens when the API is unreachable", async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new TypeError("Network request failed"));

    const expired = jest.fn();
    onSessionExpired(expired);

    await expect(refreshAccessToken()).resolves.toEqual({ status: "unavailable" });
    expect(mockClearTokens).not.toHaveBeenCalled();
    expect(expired).not.toHaveBeenCalled();
  });

  it("keeps the stored tokens when the server errors", async () => {
    // A 500 means "we couldn't check", not "your login is over".
    (global.fetch as jest.Mock).mockResolvedValue(
      reply(500, { success: false, message: "Token refresh failed." }),
    );

    await expect(refreshAccessToken()).resolves.toEqual({ status: "unavailable" });
    expect(mockClearTokens).not.toHaveBeenCalled();
  });

  it("ends the session when there is no refresh token to use", async () => {
    mockGetRefreshToken.mockResolvedValue(null);

    const expired = jest.fn();
    onSessionExpired(expired);

    await expect(refreshAccessToken()).resolves.toEqual({ status: "expired" });
    expect(global.fetch).not.toHaveBeenCalled();
    expect(expired).toHaveBeenCalled();
  });

  it("lets a later call retry after an earlier one failed", async () => {
    (global.fetch as jest.Mock)
      .mockRejectedValueOnce(new TypeError("Network request failed"))
      .mockResolvedValueOnce(reply(200, { success: true, data: { accessToken: "fresh" } }));

    await expect(refreshAccessToken()).resolves.toEqual({ status: "unavailable" });
    await expect(refreshAccessToken()).resolves.toEqual({
      status: "refreshed",
      accessToken: "fresh",
    });
  });
});
