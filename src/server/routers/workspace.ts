import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { slugify } from "@/lib/utils";
import { TRPCError } from "@trpc/server";

export const workspaceRouter = router({
  list: protectedProcedure.query(({ ctx }) =>
    ctx.db.workspace.findMany({
      where: { userId: ctx.userId },
      orderBy: { createdAt: "asc" },
    })
  ),

  getBySlug: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const workspace = await ctx.db.workspace.findUnique({
        where: { slug: input.slug },
        include: {
          _count: {
            select: {
              projects: true,
              areas: true,
              resources: true,
              notes: { where: { category: "ARCHIVE" } },
            },
          },
        },
      });
      if (!workspace || workspace.userId !== ctx.userId)
        throw new TRPCError({ code: "NOT_FOUND" });
      return workspace;
    }),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(80) }))
    .mutation(async ({ ctx, input }) => {
      const baseSlug = slugify(input.name);
      // Ensure slug uniqueness
      const existing = await ctx.db.workspace.findUnique({
        where: { slug: baseSlug },
      });
      const slug = existing ? `${baseSlug}-${Date.now()}` : baseSlug;
      return ctx.db.workspace.create({
        data: { name: input.name, slug, userId: ctx.userId },
      });
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string(), name: z.string().min(1).max(80) }))
    .mutation(async ({ ctx, input }) => {
      const ws = await ctx.db.workspace.findUnique({ where: { id: input.id } });
      if (!ws || ws.userId !== ctx.userId)
        throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.workspace.update({
        where: { id: input.id },
        data: { name: input.name },
      });
    }),
});
