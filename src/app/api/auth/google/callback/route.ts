import { google } from "googleapis";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { NextRequest, NextResponse } from "next/server";
import { getAppUrl } from "@/lib/google-oauth";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", getAppUrl()));
  }

  const code = req.nextUrl.searchParams.get("code");
  const stateParam = req.nextUrl.searchParams.get("state");
  const stateCookie = req.cookies.get("google_oauth_state")?.value;

  if (!code || !stateParam || !stateCookie || stateParam !== stateCookie) {
    return NextResponse.redirect(new URL("/settings?google=error", getAppUrl()));
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  let tokens: any;
  try {
    const result = await oauth2Client.getToken(code);
    tokens = result.tokens;
  } catch (error) {
    console.error("[google-oauth] token exchange failed:", error);
    return NextResponse.redirect(new URL("/settings?google=error", getAppUrl()));
  }

  await db.user.update({
    where: { id: userId },
    data: {
      googleAccessToken: tokens.access_token ?? null,
      googleRefreshToken: tokens.refresh_token ?? null,
      googleTokenExpiry: tokens.expiry_date
        ? new Date(tokens.expiry_date)
        : null,
    },
  });

  const response = NextResponse.redirect(new URL("/settings?google=connected", getAppUrl()));
  response.cookies.delete("google_oauth_state");
  return response;
}
