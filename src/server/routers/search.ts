import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { Prisma } from "@/generated/prisma/client";

const SearchResultType = z.enum(["note", "project", "area", "resource"]);

export const searchRouter = router({
  search: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        query: z.string().min(1),
        type: SearchResultType.optional(),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const ws = await ctx.db.workspace.findUnique({
        where: { id: input.workspaceId },
      });
      if (!ws || ws.userId !== ctx.userId)
        throw new TRPCError({ code: "NOT_FOUND" });

      // Build prefix query: "hello world" → "hello:* & world:*"
      const terms = input.query
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((t) => `${t}:*`)
        .join(" & ");

      if (!terms) return [];

      const workspaceId = input.workspaceId;
      const limit = input.limit;

      const parts: Prisma.Sql[] = [];

      if (!input.type || input.type === "note") {
        parts.push(Prisma.sql`
          SELECT id, title, 'note' AS type, icon, category::text AS category,
                 ts_rank(search_vector, to_tsquery('simple', ${terms})) AS rank,
                 ts_headline('simple', title, to_tsquery('simple', ${terms}),
                   'StartSel=<mark>, StopSel=</mark>, MaxWords=35, MinWords=15') AS headline
          FROM "Note"
          WHERE "workspaceId" = ${workspaceId}
            AND search_vector @@ to_tsquery('simple', ${terms})
        `);
      }

      if (!input.type || input.type === "project") {
        parts.push(Prisma.sql`
          SELECT id, title, 'project' AS type, icon, NULL AS category,
                 ts_rank(search_vector, to_tsquery('simple', ${terms})) AS rank,
                 ts_headline('simple', title, to_tsquery('simple', ${terms}),
                   'StartSel=<mark>, StopSel=</mark>, MaxWords=35, MinWords=15') AS headline
          FROM "Project"
          WHERE "workspaceId" = ${workspaceId}
            AND search_vector @@ to_tsquery('simple', ${terms})
        `);
      }

      if (!input.type || input.type === "area") {
        parts.push(Prisma.sql`
          SELECT id, title, 'area' AS type, icon, NULL AS category,
                 ts_rank(search_vector, to_tsquery('simple', ${terms})) AS rank,
                 ts_headline('simple', title, to_tsquery('simple', ${terms}),
                   'StartSel=<mark>, StopSel=</mark>, MaxWords=35, MinWords=15') AS headline
          FROM "Area"
          WHERE "workspaceId" = ${workspaceId}
            AND search_vector @@ to_tsquery('simple', ${terms})
        `);
      }

      if (!input.type || input.type === "resource") {
        parts.push(Prisma.sql`
          SELECT id, title, 'resource' AS type, icon, NULL AS category,
                 ts_rank(search_vector, to_tsquery('simple', ${terms})) AS rank,
                 ts_headline('simple', title, to_tsquery('simple', ${terms}),
                   'StartSel=<mark>, StopSel=</mark>, MaxWords=35, MinWords=15') AS headline
          FROM "Resource"
          WHERE "workspaceId" = ${workspaceId}
            AND search_vector @@ to_tsquery('simple', ${terms})
        `);
      }

      if (parts.length === 0) return [];

      // Join with UNION ALL
      let query = parts[0]!;
      for (let i = 1; i < parts.length; i++) {
        query = Prisma.sql`${query} UNION ALL ${parts[i]!}`;
      }
      query = Prisma.sql`${query} ORDER BY rank DESC LIMIT ${limit}`;

      const results = await ctx.db.$queryRaw<
        {
          id: string;
          title: string;
          type: "note" | "project" | "area" | "resource";
          icon: string;
          category: string | null;
          rank: number;
          headline: string;
        }[]
      >(query);

      return results;
    }),
});
