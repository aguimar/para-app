import { beforeEach, describe, expect, it, vi } from "vitest";

const executeRawUnsafeMock = vi.fn();
const queryRawUnsafeMock = vi.fn();

vi.mock("@/server/db", () => ({
  db: {
    $executeRawUnsafe: executeRawUnsafeMock,
    $queryRawUnsafe: queryRawUnsafeMock,
  },
}));

describe("cli auth store", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.DATABASE_URL = "postgres://test";
    executeRawUnsafeMock.mockReset();
    queryRawUnsafeMock.mockReset();
  });

  it("marks an auth code as redeemed in the persistent store", async () => {
    queryRawUnsafeMock.mockResolvedValueOnce([{ inserted: 1 }]);

    const { markCliAuthCodeRedeemed } = await import("@/lib/cli-auth-store");

    await expect(
      markCliAuthCodeRedeemed("code_123", new Date(Date.now() + 60_000).toISOString())
    ).resolves.toBe(true);
    expect(executeRawUnsafeMock).toHaveBeenCalled();
    expect(queryRawUnsafeMock).toHaveBeenCalled();
  });

  it("checks token revocation in the persistent store", async () => {
    queryRawUnsafeMock.mockResolvedValueOnce([{ exists: 1 }]);

    const { isCliTokenRevoked } = await import("@/lib/cli-auth-store");

    await expect(isCliTokenRevoked("token_123")).resolves.toBe(true);
    expect(executeRawUnsafeMock).toHaveBeenCalled();
    expect(queryRawUnsafeMock).toHaveBeenCalled();
  });
});
