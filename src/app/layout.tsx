import type { Metadata } from "next";
import { Manrope, Inter } from "next/font/google";
import Script from "next/script";
import { ClerkProvider } from "@clerk/nextjs";
import { TRPCProvider } from "@/components/providers/TRPCProvider";
import { getLocaleFromCookies } from "@/lib/get-locale";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-headline",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Second Brain — PARA",
  description: "Organize your knowledge with the PARA methodology",
};

const gaId = process.env.NEXT_PUBLIC_GA_ID;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocaleFromCookies();

  return (
    <ClerkProvider>
      <html lang={locale} className={`h-full ${manrope.variable} ${inter.variable}`}>
        <head>
          <link rel="stylesheet" href="/blocknote.css" />
        </head>
        <body className="h-full bg-background text-on-surface antialiased" suppressHydrationWarning>
          <TRPCProvider>{children}</TRPCProvider>
          {gaId ? (
            <>
              <Script
                src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
                strategy="afterInteractive"
              />
              <Script id="google-analytics" strategy="afterInteractive">
                {`
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${gaId}');
                `}
              </Script>
            </>
          ) : null}
        </body>
      </html>
    </ClerkProvider>
  );
}
