import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const areaRouter = router({
  list: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      const ws = await ctx.db.workspace.findUnique({
        where: { id: input.workspaceId },
      });
      if (!ws || ws.userId !== ctx.userId)
        throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.area.findMany({
        where: { workspaceId: input.workspaceId },
        orderBy: { updatedAt: "desc" },
        include: { _count: { select: { notes: true } } },
      });
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const area = await ctx.db.area.findUnique({
        where: { id: input.id },
        include: { notes: { orderBy: { updatedAt: "desc" } }, workspace: true },
      });
      if (!area || area.workspace.userId !== ctx.userId)
        throw new TRPCError({ code: "NOT_FOUND" });
      return area;
    }),

  create: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        title: z.string().min(1).max(200),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const ws = await ctx.db.workspace.findUnique({
        where: { id: input.workspaceId },
      });
      if (!ws || ws.userId !== ctx.userId)
        throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.area.create({ data: input });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(200).optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const area = await ctx.db.area.findUnique({
        where: { id },
        include: { workspace: true },
      });
      if (!area || area.workspace.userId !== ctx.userId)
        throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.area.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const area = await ctx.db.area.findUnique({
        where: { id: input.id },
        include: { workspace: true },
      });
      if (!area || area.workspace.userId !== ctx.userId)
        throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.area.delete({ where: { id: input.id } });
    }),
});
