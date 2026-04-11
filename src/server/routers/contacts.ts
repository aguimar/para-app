import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { google } from "googleapis";
import { PrismaClient } from "@/generated/prisma/client";

async function makeOAuth2Client(
  accessToken: string,
  refreshToken: string | null,
  expiry: Date | null,
  userId: string,
  db: PrismaClient
) {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken ?? undefined,
    expiry_date: expiry?.getTime(),
  });

  // Auto-refresh if expired
  if (expiry && expiry < new Date()) {
    const { credentials } = await client.refreshAccessToken();
    await db.user.update({
      where: { id: userId },
      data: {
        googleAccessToken: credentials.access_token ?? null,
        googleRefreshToken: credentials.refresh_token ?? undefined,
        googleTokenExpiry: credentials.expiry_date
          ? new Date(credentials.expiry_date)
          : null,
      },
    });
    client.setCredentials(credentials);
  }

  return client;
}

export const contactsRouter = router({
  search: protectedProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.userId },
        select: {
          googleAccessToken: true,
          googleRefreshToken: true,
          googleTokenExpiry: true,
        },
      });

      if (!user?.googleAccessToken) return [];

      try {
        const auth = await makeOAuth2Client(
          user.googleAccessToken,
          user.googleRefreshToken,
          user.googleTokenExpiry,
          ctx.userId,
          ctx.db
        );

        const people = google.people({ version: "v1", auth });
        const res = await people.people.searchContacts({
          query: input.query,
          readMask: "names,emailAddresses,photos",
          pageSize: 10,
        });

        return (res.data.results ?? [])
          .map((r) => {
            const person = r.person!;
            return {
              googleId: person.resourceName ?? "",
              name: person.names?.[0]?.displayName ?? "",
              email: person.emailAddresses?.[0]?.value ?? "",
              photoUrl: person.photos?.[0]?.url ?? "",
            };
          })
          .filter((c) => c.googleId && c.email);
      } catch (error) {
        console.error("[contacts] search failed:", error);
        return [];
      }
    }),

  disconnect: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db.user.update({
      where: { id: ctx.userId },
      data: {
        googleAccessToken: null,
        googleRefreshToken: null,
        googleTokenExpiry: null,
      },
    });
  }),
});
