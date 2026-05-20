import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { parseCliCallbackUrl } from "@/lib/cli-auth";

export async function POST(request: Request) {
  let callbackUrl: string;

  try {
    const body = (await request.json()) as { callback_url?: unknown };
    callbackUrl = parseCliCallbackUrl(body.callback_url);
  } catch {
    return NextResponse.json({ error: "invalid callback_url" }, { status: 400 });
  }

  const state = randomBytes(16).toString("hex");
  const authorizeUrl = new URL("/api/cli/auth/exchange", request.url);
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("callback_url", callbackUrl);

  return NextResponse.json({
    authorize_url: authorizeUrl.toString(),
    state,
  });
}
