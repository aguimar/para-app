export function getAppUrl(): string {
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!redirectUri?.includes("/api/auth/google/callback")) {
    throw new Error("GOOGLE_REDIRECT_URI must include /api/auth/google/callback");
  }
  return redirectUri.replace("/api/auth/google/callback", "");
}
