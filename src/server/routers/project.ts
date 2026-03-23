import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { PrismaClient } from "@/generated/prisma/client";

const projectInput = z.object({
  title: z.string().min(1).max(200),
  icon: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["ACTIVE", "ON_HOLD", "COMPLETED"]).optional(),
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]).optional(),
  progress: z.number().min(0).max(100).optional(),
  deadline: z.date().optional(),
  areaId: z.string().nullable().optional(),
});

async function assertWorkspaceAccess(
  ctx: { db: PrismaClient; userId: string },
  workspaceId: string
) {
  const ws = await ctx.db.workspace.findUnique({ where: { id: workspaceId } });
  if (!ws || ws.userId !== ctx.userId)
    throw new TRPCError({ code: "NOT_FOUND" });
}

export const projectRouter = router({
  list: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertWorkspaceAccess(ctx, input.workspaceId);
      return ctx.db.project.findMany({
        where: { workspaceId: input.workspaceId },
        orderBy: { updatedAt: "desc" },
        include: { _count: { select: { notes: true } }, area: { select: { id: true, title: true, icon: true } } },
      });
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.project.findUnique({
        where: { id: input.id },
        include: {
          notes: { orderBy: { updatedAt: "desc" } },
          workspace: true,
          area: { select: { id: true, title: true, icon: true } },
        },
      });
      if (!project || project.workspace.userId !== ctx.userId)
        throw new TRPCError({ code: "NOT_FOUND" });
      return project;
    }),

  create: protectedProcedure
    .input(projectInput.extend({ workspaceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertWorkspaceAccess(ctx, input.workspaceId);
      return ctx.db.project.create({ data: input });
    }),

  update: protectedProcedure
    .input(projectInput.partial().extend({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const project = await ctx.db.project.findUnique({
        where: { id },
        include: { workspace: true },
      });
      if (!project || project.workspace.userId !== ctx.userId)
        throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.project.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.project.findUnique({
        where: { id: input.id },
        include: { workspace: true },
      });
      if (!project || project.workspace.userId !== ctx.userId)
        throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.project.delete({ where: { id: input.id } });
    }),
});
