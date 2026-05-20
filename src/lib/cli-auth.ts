import { createHmac, randomBytes, timingSafeEqual } from "crypto";

export type CliTokenPayload = {
  userId: string;
  email: string;
};

type CliTokenClaims = CliTokenPayload & {
  exp: string;
  nonce: string;
};

type CliAuthCodeClaims = CliTokenPayload & {
  state: string;
  callbackUrl: string;
  exp: string;
  nonce: string;
};

const CLI_TOKEN_TTL_MS = 1000 * 60 * 60 * 24;
const CLI_AUTH_CODE_TTL_MS = 1000 * 60 * 5;
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);

function getCliTokenSecret() {
  const secret = process.env.CLI_TOKEN_SECRET;
  if (!secret) {
    throw new Error("CLI_TOKEN_SECRET is not configured");
  }
  return secret;
}

function encodeBase64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signClaims(encodedClaims: string) {
  return createHmac("sha256", getCliTokenSecret())
    .update(encodedClaims)
    .digest("base64url");
}

function assertValidTokenClaims(claims: unknown): asserts claims is CliTokenClaims {
  if (!claims || typeof claims !== "object" || Array.isArray(claims)) {
    throw new Error("invalid token claims");
  }

  const record = claims as Record<string, unknown>;
  if (
    typeof record.userId !== "string" ||
    !record.userId ||
    typeof record.email !== "string" ||
    !record.email ||
    typeof record.exp !== "string" ||
    !record.exp ||
    typeof record.nonce !== "string" ||
    !record.nonce
  ) {
    throw new Error("invalid token claims");
  }
}

function assertValidAuthCodeClaims(
  claims: unknown
): asserts claims is CliAuthCodeClaims {
  if (!claims || typeof claims !== "object" || Array.isArray(claims)) {
    throw new Error("invalid auth code claims");
  }

  const record = claims as Record<string, unknown>;
  if (
    typeof record.userId !== "string" ||
    !record.userId ||
    typeof record.email !== "string" ||
    !record.email ||
    typeof record.state !== "string" ||
    !record.state ||
    typeof record.callbackUrl !== "string" ||
    !record.callbackUrl ||
    typeof record.exp !== "string" ||
    !record.exp ||
    typeof record.nonce !== "string" ||
    !record.nonce
  ) {
    throw new Error("invalid auth code claims");
  }
}

function verifySignedToken<T>(
  token: string,
  claimsValidator: (claims: unknown) => asserts claims is T,
  invalidClaimsMessage: string
) {
  const parts = token.split(".");
  if (parts.length !== 2) {
    throw new Error("invalid token format");
  }

  const [encodedClaims, signature] = parts;
  const expectedSignature = signClaims(encodedClaims);
  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (
    provided.length !== expected.length ||
    !timingSafeEqual(provided, expected)
  ) {
    throw new Error("invalid token signature");
  }

  const claims = JSON.parse(decodeBase64Url(encodedClaims)) as unknown;
  try {
    claimsValidator(claims);
  } catch {
    throw new Error(invalidClaimsMessage);
  }

  return claims;
}

export function parseCliCallbackUrl(callbackUrl: unknown) {
  if (typeof callbackUrl !== "string" || !callbackUrl) {
    throw new Error("invalid callback_url");
  }

  const parsed = new URL(callbackUrl);
  if (parsed.protocol !== "http:" || !LOOPBACK_HOSTS.has(parsed.hostname)) {
    throw new Error("invalid callback_url");
  }

  return parsed.toString();
}

export function createCliToken(input: CliTokenPayload) {
  const expiresAt = new Date(Date.now() + CLI_TOKEN_TTL_MS).toISOString();
  const claims: CliTokenClaims = {
    userId: input.userId,
    email: input.email,
    exp: expiresAt,
    nonce: randomBytes(16).toString("hex"),
  };

  const encodedClaims = encodeBase64Url(JSON.stringify(claims));
  const signature = signClaims(encodedClaims);

  return {
    accessToken: `${encodedClaims}.${signature}`,
    expiresAt,
  };
}

export function verifyCliToken(token: string) {
  const claims = verifySignedToken(
    token,
    assertValidTokenClaims,
    "invalid token claims"
  );

  const expiresAt = Date.parse(claims.exp);
  if (Number.isNaN(expiresAt) || expiresAt <= Date.now()) {
    throw new Error("token expired");
  }

  return {
    userId: claims.userId,
    email: claims.email,
    expiresAt: claims.exp,
  };
}

export function createCliAuthCode(
  input: CliTokenPayload & { state: string; callbackUrl: string }
) {
  const expiresAt = new Date(Date.now() + CLI_AUTH_CODE_TTL_MS).toISOString();
  const claims: CliAuthCodeClaims = {
    userId: input.userId,
    email: input.email,
    state: input.state,
    callbackUrl: input.callbackUrl,
    exp: expiresAt,
    nonce: randomBytes(16).toString("hex"),
  };

  const encodedClaims = encodeBase64Url(JSON.stringify(claims));
  const signature = signClaims(encodedClaims);

  return {
    code: `${encodedClaims}.${signature}`,
    expiresAt,
  };
}

export function verifyCliAuthCode(code: string) {
  const claims = verifySignedToken(
    code,
    assertValidAuthCodeClaims,
    "invalid auth code claims"
  );

  const expiresAt = Date.parse(claims.exp);
  if (Number.isNaN(expiresAt) || expiresAt <= Date.now()) {
    throw new Error("auth code expired");
  }

  return {
    userId: claims.userId,
    email: claims.email,
    state: claims.state,
    callbackUrl: claims.callbackUrl,
    expiresAt: claims.exp,
  };
}
