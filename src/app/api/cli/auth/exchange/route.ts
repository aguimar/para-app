import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  createCliAuthCode,
  createCliToken,
  parseCliCallbackUrl,
  verifyCliAuthCode,
} from "@/lib/cli-auth";
import { markCliAuthCodeRedeemed } from "@/lib/cli-auth-store";

function getPrimaryEmail(user: Awaited<ReturnType<typeof currentUser>>) {
  if (!user) {
    return null;
  }

  return (
    user.emailAddresses.find(
      (email) => email.id === user.primaryEmailAddressId
    )?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? null
  );
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const state = requestUrl.searchParams.get("state");
  const callbackUrl = requestUrl.searchParams.get("callback_url");
  if (!state || !callbackUrl) {
    return NextResponse.json({ error: "missing state or callback_url" }, { status: 400 });
  }

  const { userId } = await auth();
  if (!userId) {
    const signInUrl = new URL("/sign-in", requestUrl.origin);
    signInUrl.searchParams.set("redirect_url", requestUrl.toString());
    return NextResponse.redirect(signInUrl);
  }

  let parsedCallbackUrl: string;
  try {
    parsedCallbackUrl = parseCliCallbackUrl(callbackUrl);
  } catch {
    return NextResponse.json({ error: "invalid callback_url" }, { status: 400 });
  }

  const user = await currentUser();
  const email = getPrimaryEmail(user);
  if (!email) {
    return NextResponse.json({ error: "missing email" }, { status: 400 });
  }

  const authCode = createCliAuthCode({
    userId,
    email,
    state,
    callbackUrl: parsedCallbackUrl,
  });

  const redirectUrl = new URL(parsedCallbackUrl);
  redirectUrl.searchParams.set("code", authCode.code);
  redirectUrl.searchParams.set("state", state);

  return NextResponse.redirect(redirectUrl);
}

export async function POST(request: Request) {
  let code: string;
  let state: string;
  let callbackUrl: string;

  try {
    const body = (await request.json()) as {
      code?: unknown;
      state?: unknown;
      callback_url?: unknown;
    };

    if (typeof body.code !== "string" || !body.code) {
      throw new Error("invalid code");
    }
    if (typeof body.state !== "string" || !body.state) {
      throw new Error("invalid state");
    }

    code = body.code;
    state = body.state;
    callbackUrl = parseCliCallbackUrl(body.callback_url);
  } catch {
    return NextResponse.json({ error: "invalid exchange payload" }, { status: 400 });
  }

  let authCode;
  try {
    authCode = verifyCliAuthCode(code);
  } catch {
    return NextResponse.json({ error: "invalid code" }, { status: 401 });
  }

  if (authCode.state !== state || authCode.callbackUrl !== callbackUrl) {
    return NextResponse.json({ error: "exchange mismatch" }, { status: 401 });
  }

  if (!(await markCliAuthCodeRedeemed(code, authCode.expiresAt))) {
    return NextResponse.json({ error: "invalid code" }, { status: 401 });
  }

  const token = createCliToken({
    userId: authCode.userId,
    email: authCode.email,
  });

  return NextResponse.json({
    access_token: token.accessToken,
    user_id: authCode.userId,
    email: authCode.email,
    expires_at: token.expiresAt,
  });
}
