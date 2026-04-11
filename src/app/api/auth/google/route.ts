import { google } from "googleapis";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getAppUrl } from "@/lib/google-oauth";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", getAppUrl()));
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/contacts.readonly"],
    prompt: "consent",
  });

  return NextResponse.redirect(url);
}
