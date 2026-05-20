import { createHash } from "crypto";

const redeemedCliAuthCodes = new Map<string, number>();
const revokedCliTokens = new Map<string, number>();

function shouldUseMemoryStore() {
  return process.env.NODE_ENV === "test";
}

function ensurePersistenceConfigured() {
  if (!shouldUseMemoryStore() && !process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }
}

async function getDb() {
  const { db } = await import("@/server/db");
  return db;
}

function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function cleanupExpiredEntries(store: Map<string, number>) {
  const now = Date.now();
  for (const [key, expiresAt] of store) {
    if (expiresAt <= now) {
      store.delete(key);
    }
  }
}

function rememberExpiringEntry(
  store: Map<string, number>,
  key: string,
  expiresAt: string
) {
  cleanupExpiredEntries(store);
  store.set(key, Date.parse(expiresAt));
}

export async function markCliAuthCodeRedeemed(code: string, expiresAt: string) {
  ensurePersistenceConfigured();

  if (shouldUseMemoryStore()) {
    cleanupExpiredEntries(redeemedCliAuthCodes);
    if (redeemedCliAuthCodes.has(code)) {
      return false;
    }

    rememberExpiringEntry(redeemedCliAuthCodes, code, expiresAt);
    return true;
  }

  const db = await getDb();

  await db.$executeRawUnsafe(
    'DELETE FROM "CliAuthCodeRedemption" WHERE "expiresAt" <= NOW()'
  );

  const inserted = await db.$queryRawUnsafe<Array<{ inserted: number }>>(
    `INSERT INTO "CliAuthCodeRedemption" ("codeHash", "expiresAt", "createdAt")
     VALUES ($1, $2, NOW())
     ON CONFLICT ("codeHash") DO NOTHING
     RETURNING 1 AS inserted`,
    hashValue(code),
    new Date(expiresAt)
  );

  return inserted.length > 0;
}

export async function revokeCliToken(token: string, expiresAt: string) {
  ensurePersistenceConfigured();

  if (shouldUseMemoryStore()) {
    rememberExpiringEntry(revokedCliTokens, token, expiresAt);
    return;
  }

  const db = await getDb();

  await db.$executeRawUnsafe(
    'DELETE FROM "CliTokenRevocation" WHERE "expiresAt" <= NOW()'
  );

  await db.$executeRawUnsafe(
    `INSERT INTO "CliTokenRevocation" ("tokenHash", "expiresAt", "createdAt")
     VALUES ($1, $2, NOW())
     ON CONFLICT ("tokenHash") DO NOTHING`,
    hashValue(token),
    new Date(expiresAt)
  );
}

export async function isCliTokenRevoked(token: string) {
  ensurePersistenceConfigured();

  if (shouldUseMemoryStore()) {
    cleanupExpiredEntries(revokedCliTokens);
    return revokedCliTokens.has(token);
  }

  const db = await getDb();

  await db.$executeRawUnsafe(
    'DELETE FROM "CliTokenRevocation" WHERE "expiresAt" <= NOW()'
  );

  const rows = await db.$queryRawUnsafe<Array<{ exists: number }>>(
    `SELECT 1 AS exists
     FROM "CliTokenRevocation"
     WHERE "tokenHash" = $1
     LIMIT 1`,
    hashValue(token)
  );

  return rows.length > 0;
}
