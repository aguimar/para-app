import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const resourceRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        tag: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const ws = await ctx.db.workspace.findUnique({
        where: { id: input.workspaceId },
      });
      if (!ws || ws.userId !== ctx.userId)
        throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.resource.findMany({
        where: {
          workspaceId: input.workspaceId,
          ...(input.tag && { tags: { has: input.tag } }),
        },
        orderBy: { updatedAt: "desc" },
        include: { _count: { select: { notes: true } } },
      });
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const resource = await ctx.db.resource.findUnique({
        where: { id: input.id },
        include: {
          notes: { orderBy: { updatedAt: "desc" } },
          workspace: true,
        },
      });
      if (!resource || resource.workspace.userId !== ctx.userId)
        throw new TRPCError({ code: "NOT_FOUND" });
      return resource;
    }),

  create: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        title: z.string().min(1).max(200),
        icon: z.string().default(""),
        description: z.string().optional(),
        tags: z.array(z.string()).default([]),
        url: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const ws = await ctx.db.workspace.findUnique({
        where: { id: input.workspaceId },
      });
      if (!ws || ws.userId !== ctx.userId)
        throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.resource.create({ data: input });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(200).optional(),
        icon: z.string().optional(),
        description: z.string().optional(),
        tags: z.array(z.string()).optional(),
        url: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const resource = await ctx.db.resource.findUnique({
        where: { id },
        include: { workspace: true },
      });
      if (!resource || resource.workspace.userId !== ctx.userId)
        throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.resource.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const resource = await ctx.db.resource.findUnique({
        where: { id: input.id },
        include: { workspace: true },
      });
      if (!resource || resource.workspace.userId !== ctx.userId)
        throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.resource.delete({ where: { id: input.id } });
    }),
});
