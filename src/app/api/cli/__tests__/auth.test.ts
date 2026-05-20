import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "crypto";
import {
  createCliAuthCode,
  createCliToken,
  parseCliCallbackUrl,
  verifyCliAuthCode,
  verifyCliToken,
} from "@/lib/cli-auth";

const headersMock = vi.fn();
const authMock = vi.fn();
const currentUserMock = vi.fn();
const isCliTokenRevokedMock = vi.fn();
const markCliAuthCodeRedeemedMock = vi.fn();
const revokeCliTokenMock = vi.fn();

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
  currentUser: currentUserMock,
}));

vi.mock("@/lib/cli-auth-store", () => ({
  isCliTokenRevoked: isCliTokenRevokedMock,
  markCliAuthCodeRedeemed: markCliAuthCodeRedeemedMock,
  revokeCliToken: revokeCliTokenMock,
}));

function signTokenClaims(claims: unknown) {
  const encodedClaims = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = createHmac("sha256", process.env.CLI_TOKEN_SECRET ?? "")
    .update(encodedClaims)
    .digest("base64url");
  return `${encodedClaims}.${signature}`;
}

describe("createCliToken", () => {
  beforeEach(() => {
    process.env.CLI_TOKEN_SECRET = "test-secret";
  });

  it("creates a verifiable token payload with expiration metadata", () => {
    const token = createCliToken({
      userId: "user_123",
      email: "user@example.com",
    });

    expect(token.accessToken).toContain(".");
    expect(Date.parse(token.expiresAt)).not.toBeNaN();

    expect(verifyCliToken(token.accessToken)).toMatchObject({
      userId: "user_123",
      email: "user@example.com",
      expiresAt: token.expiresAt,
    });
  });

  it("rejects tampered signatures", () => {
    const token = createCliToken({
      userId: "user_123",
      email: "user@example.com",
    });
    const [claims] = token.accessToken.split(".");

    expect(() => verifyCliToken(`${claims}.tampered`)).toThrow(
      "invalid token signature"
    );
  });

  it("rejects malformed token shapes", () => {
    expect(() => verifyCliToken("one.two.three")).toThrow(
      "invalid token format"
    );
  });

  it("rejects signed tokens with invalid claims", () => {
    const expiresAt = new Date(Date.now() + 60_000).toISOString();
    const token = signTokenClaims({ exp: expiresAt, nonce: "abc123" });

    expect(() => verifyCliToken(token)).toThrow("invalid token claims");
  });

  it("rejects signed tokens with non-object claims", () => {
    const token = signTokenClaims(null);

    expect(() => verifyCliToken(token)).toThrow("invalid token claims");
  });

  it("fails closed when the token secret is missing", () => {
    delete process.env.CLI_TOKEN_SECRET;

    expect(() =>
      createCliToken({
        userId: "user_123",
        email: "user@example.com",
      })
    ).toThrow("CLI_TOKEN_SECRET is not configured");
  });
});

describe("createCliAuthCode", () => {
  beforeEach(() => {
    process.env.CLI_TOKEN_SECRET = "test-secret";
    markCliAuthCodeRedeemedMock.mockReset();
    markCliAuthCodeRedeemedMock.mockResolvedValue(true);
  });

  it("creates a verifiable auth code", () => {
    const authCode = createCliAuthCode({
      userId: "user_123",
      email: "user@example.com",
      state: "state_123",
      callbackUrl: "http://127.0.0.1:4444/callback",
    });

    expect(verifyCliAuthCode(authCode.code)).toMatchObject({
      userId: "user_123",
      email: "user@example.com",
      state: "state_123",
      callbackUrl: "http://127.0.0.1:4444/callback",
    });
  });

  it("accepts only loopback callback URLs", () => {
    expect(parseCliCallbackUrl("http://127.0.0.1:4444/callback")).toBe(
      "http://127.0.0.1:4444/callback"
    );
    expect(() => parseCliCallbackUrl("https://evil.example/callback")).toThrow(
      "invalid callback_url"
    );
  });
});

describe("requireCliBearerToken", () => {
  beforeEach(() => {
    headersMock.mockReset();
    isCliTokenRevokedMock.mockReset();
    isCliTokenRevokedMock.mockResolvedValue(false);
  });

  it("returns the bearer token value", async () => {
    headersMock.mockResolvedValueOnce(
      new Headers({ authorization: "Bearer token_123" })
    );

    const { requireCliBearerToken } = await import("@/lib/cli-api");

    await expect(requireCliBearerToken()).resolves.toBe("token_123");
  });

  it("accepts case-insensitive bearer schemes", async () => {
    headersMock.mockResolvedValueOnce(
      new Headers({ authorization: "bearer token_123" })
    );

    const { requireCliBearerToken } = await import("@/lib/cli-api");

    await expect(requireCliBearerToken()).resolves.toBe("token_123");
  });

  it("rejects when the header is missing", async () => {
    headersMock.mockResolvedValueOnce(new Headers());

    const { requireCliBearerToken } = await import("@/lib/cli-api");

    await expect(requireCliBearerToken()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("rejects when the bearer value is empty", async () => {
    headersMock.mockResolvedValueOnce(
      new Headers({ authorization: "Bearer    " })
    );

    const { requireCliBearerToken } = await import("@/lib/cli-api");

    await expect(requireCliBearerToken()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});

describe("cli auth routes", () => {
  beforeEach(() => {
    process.env.CLI_TOKEN_SECRET = "test-secret";
    authMock.mockReset();
    currentUserMock.mockReset();
    headersMock.mockReset();
    isCliTokenRevokedMock.mockReset();
    isCliTokenRevokedMock.mockResolvedValue(false);
    markCliAuthCodeRedeemedMock.mockReset();
    markCliAuthCodeRedeemedMock.mockResolvedValue(true);
    revokeCliTokenMock.mockReset();
    revokeCliTokenMock.mockResolvedValue(undefined);
  });

  it("starts the auth flow with an authorize URL and state", async () => {
    const { POST } = await import("@/app/api/cli/auth/start/route");
    const response = await POST(
      new Request("http://app.test/api/cli/auth/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          callback_url: "http://127.0.0.1:4444/callback",
        }),
      })
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.state).toBeTruthy();
    expect(body.authorize_url).toContain("/api/cli/auth/exchange");
    expect(body.authorize_url).toContain("callback_url=");
  });

  it("rejects non-loopback callback URLs at start", async () => {
    const { POST } = await import("@/app/api/cli/auth/start/route");
    const response = await POST(
      new Request("http://app.test/api/cli/auth/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          callback_url: "https://evil.example/callback",
        }),
      })
    );

    expect(response.status).toBe(400);
  });

  it("redirects the browser to the CLI callback with code and state", async () => {
    authMock.mockResolvedValueOnce({ userId: "user_123" });
    currentUserMock.mockResolvedValueOnce({
      primaryEmailAddressId: "email_1",
      emailAddresses: [{ id: "email_1", emailAddress: "user@example.com" }],
    });

    const { GET } = await import("@/app/api/cli/auth/exchange/route");
    const response = await GET(
      new Request(
        "http://app.test/api/cli/auth/exchange?state=state_123&callback_url=http%3A%2F%2F127.0.0.1%3A4444%2Fcallback"
      )
    );

    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toBeTruthy();

    const redirectUrl = new URL(location!);
    expect(redirectUrl.searchParams.get("state")).toBe("state_123");
    const code = redirectUrl.searchParams.get("code");
    expect(code).toBeTruthy();
    expect(verifyCliAuthCode(code!)).toMatchObject({
      userId: "user_123",
      email: "user@example.com",
      state: "state_123",
      callbackUrl: "http://127.0.0.1:4444/callback",
    });
  });

  it("exchanges a valid auth code for a CLI token only once", async () => {
    const authCode = createCliAuthCode({
      userId: "user_123",
      email: "user@example.com",
      state: "state_123",
      callbackUrl: "http://127.0.0.1:4444/callback",
    });

    const { POST } = await import("@/app/api/cli/auth/exchange/route");
    const request = new Request("http://app.test/api/cli/auth/exchange", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        code: authCode.code,
        state: "state_123",
        callback_url: "http://127.0.0.1:4444/callback",
      }),
    });
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.user_id).toBe("user_123");
    expect(body.email).toBe("user@example.com");
    expect(body.access_token).toBeTruthy();
    expect(verifyCliToken(body.access_token)).toMatchObject({
      userId: "user_123",
      email: "user@example.com",
    });
    expect(markCliAuthCodeRedeemedMock).toHaveBeenCalledTimes(1);

    markCliAuthCodeRedeemedMock.mockResolvedValueOnce(false);
    const secondResponse = await POST(
      new Request("http://app.test/api/cli/auth/exchange", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          code: authCode.code,
          state: "state_123",
          callback_url: "http://127.0.0.1:4444/callback",
        }),
      })
    );
    expect(secondResponse.status).toBe(401);
  });

  it("does not burn a code on state mismatch before redemption", async () => {
    const authCode = createCliAuthCode({
      userId: "user_123",
      email: "user@example.com",
      state: "state_123",
      callbackUrl: "http://127.0.0.1:4444/callback",
    });

    const { POST } = await import("@/app/api/cli/auth/exchange/route");
    const response = await POST(
      new Request("http://app.test/api/cli/auth/exchange", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          code: authCode.code,
          state: "wrong",
          callback_url: "http://127.0.0.1:4444/callback",
        }),
      })
    );

    expect(response.status).toBe(401);
    expect(markCliAuthCodeRedeemedMock).not.toHaveBeenCalled();
  });

  it("revokes the token on logout", async () => {
    const token = createCliToken({
      userId: "user_123",
      email: "user@example.com",
    });
    headersMock.mockResolvedValueOnce(
      new Headers({ authorization: `Bearer ${token.accessToken}` })
    );

    const { POST } = await import("@/app/api/cli/auth/logout/route");
    const response = await POST();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(revokeCliTokenMock).toHaveBeenCalledWith(
      token.accessToken,
      expect.any(String)
    );
  });
});
