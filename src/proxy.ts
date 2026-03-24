import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
]);

const LOCALES = ["pt-BR", "en-US"];
const DEFAULT_LOCALE = "pt-BR";

function getLocale(request: Request): string {
  // 1. Cookie
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(/NEXT_LOCALE=([^;]+)/);
  if (match && LOCALES.includes(match[1])) return match[1];

  // 2. Accept-Language
  const acceptLang = request.headers.get("accept-language") ?? "";
  if (acceptLang.includes("pt")) return "pt-BR";
  if (acceptLang.includes("en")) return "en-US";

  return DEFAULT_LOCALE;
}

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }

  // Set NEXT_LOCALE cookie if absent
  const locale = getLocale(request);
  const hasCookie = (request.headers.get("cookie") ?? "").includes("NEXT_LOCALE=");

  if (!hasCookie) {
    const response = NextResponse.next();
    response.cookies.set("NEXT_LOCALE", locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    return response;
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
