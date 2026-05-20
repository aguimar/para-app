import { NextResponse } from "next/server";
import { requireCliSession } from "@/lib/cli-api";
import { revokeCliToken } from "@/lib/cli-auth-store";

export async function POST() {
  try {
    const session = await requireCliSession();
    await revokeCliToken(session.token, session.claims.expiresAt);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
}
