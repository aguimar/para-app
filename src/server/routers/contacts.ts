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

        const [contactsRes, otherRes] = await Promise.allSettled([
          people.people.searchContacts({
            query: input.query,
            readMask: "names,emailAddresses,photos",
            pageSize: 10,
          }),
          people.otherContacts.search({
            query: input.query,
            readMask: "names,emailAddresses,photos",
            pageSize: 10,
          }),
        ]);

        const toPerson = (person: {
          resourceName?: string | null;
          names?: { displayName?: string | null }[] | null;
          emailAddresses?: { value?: string | null }[] | null;
          photos?: { url?: string | null }[] | null;
        }) => ({
          googleId: person.resourceName ?? "",
          name: person.names?.[0]?.displayName ?? "",
          email: person.emailAddresses?.[0]?.value ?? "",
          photoUrl: person.photos?.[0]?.url ?? "",
        });

        const contactPeople =
          contactsRes.status === "fulfilled"
            ? (contactsRes.value.data.results ?? []).map((r) => toPerson(r.person!))
            : [];

        const otherPeople =
          otherRes.status === "fulfilled"
            ? (otherRes.value.data.results ?? []).map((r) => toPerson(r.person!))
            : [];

        const seen = new Set<string>();
        return [...contactPeople, ...otherPeople]
          .filter((c) => c.googleId && c.email && !seen.has(c.email) && seen.add(c.email))
          .slice(0, 10);
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
