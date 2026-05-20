import { headers } from "next/headers";
import { TRPCError } from "@trpc/server";
import { verifyCliToken } from "@/lib/cli-auth";
import { isCliTokenRevoked } from "@/lib/cli-auth-store";

const BEARER_PREFIX = /^Bearer\s+/i;

export async function requireCliBearerToken() {
  const authHeader = (await headers()).get("authorization")?.trim();
  if (!authHeader || !BEARER_PREFIX.test(authHeader)) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const token = authHeader.replace(BEARER_PREFIX, "").trim();
  if (!token) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return token;
}

export async function requireCliSession() {
  const token = await requireCliBearerToken();

  let claims;
  try {
    claims = verifyCliToken(token);
  } catch {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  if (await isCliTokenRevoked(token)) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return {
    token,
    claims,
  };
}
