import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { suggestParaCategory } from "@/lib/openrouter";
import { bodyToPlainText } from "@/lib/utils";

export const noteRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        category: z.enum(["PROJECT", "AREA", "RESOURCE", "ARCHIVE"]).optional(),
        parentId: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const ws = await ctx.db.workspace.findUnique({
        where: { id: input.workspaceId },
      });
      if (!ws || ws.userId !== ctx.userId)
        throw new TRPCError({ code: "NOT_FOUND" });

      const notes = await ctx.db.note.findMany({
        where: {
          workspaceId: input.workspaceId,
          ...(input.category && { category: input.category }),
          ...(input.parentId && {
            OR: [
              { projectId: input.parentId },
              { areaId: input.parentId },
              { resourceId: input.parentId },
            ],
          }),
        },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { updatedAt: "desc" },
      });

      let nextCursor: string | undefined;
      if (notes.length > input.limit) {
        const next = notes.pop();
        nextCursor = next?.id;
      }

      return { notes, nextCursor };
    }),

  recent: protectedProcedure
    .input(z.object({ workspaceId: z.string(), limit: z.number().default(10) }))
    .query(async ({ ctx, input }) => {
      const ws = await ctx.db.workspace.findUnique({
        where: { id: input.workspaceId },
      });
      if (!ws || ws.userId !== ctx.userId)
        throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.note.findMany({
        where: { workspaceId: input.workspaceId },
        orderBy: { updatedAt: "desc" },
        take: input.limit,
      });
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const note = await ctx.db.note.findUnique({
        where: { id: input.id },
        include: {
          workspace: true,
          project: true,
          area: true,
          resource: true,
          backlinks: true,
          linkedFrom: true,
        },
      });
      if (!note || note.workspace.userId !== ctx.userId)
        throw new TRPCError({ code: "NOT_FOUND" });
      return note;
    }),

  create: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        title: z.string().default("Untitled"),
        body: z.string().default(""),
        category: z
          .enum(["INBOX", "PROJECT", "AREA", "RESOURCE", "ARCHIVE"])
          .default("INBOX"),
        tags: z.array(z.string()).default([]),
        dueDate: z.date().nullable().optional(),
        startDate: z.date().nullable().optional(),
        projectId: z.string().optional(),
        areaId: z.string().optional(),
        resourceId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const ws = await ctx.db.workspace.findUnique({
        where: { id: input.workspaceId },
      });
      if (!ws || ws.userId !== ctx.userId)
        throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.note.create({ data: input });
    }),

  // Assign an inbox note to a PARA container (drag-and-drop)
  assign: protectedProcedure
    .input(
      z.object({
        noteId: z.string(),
        category: z.enum(["PROJECT", "AREA", "RESOURCE", "ARCHIVE"]),
        projectId: z.string().optional(),
        areaId: z.string().optional(),
        resourceId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const note = await ctx.db.note.findUnique({
        where: { id: input.noteId },
        include: { workspace: true },
      });
      if (!note || note.workspace.userId !== ctx.userId)
        throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.note.update({
        where: { id: input.noteId },
        data: {
          category: input.category,
          projectId: input.projectId ?? null,
          areaId: input.areaId ?? null,
          resourceId: input.resourceId ?? null,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        icon: z.string().optional(),
        body: z.string().optional(),
        category: z
          .enum(["INBOX", "PROJECT", "AREA", "RESOURCE", "ARCHIVE"])
          .optional(),
        status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
        tags: z.array(z.string()).optional(),
        dueDate: z.date().nullable().optional(),
        startDate: z.date().nullable().optional(),
        projectId: z.string().nullable().optional(),
        areaId: z.string().nullable().optional(),
        resourceId: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const note = await ctx.db.note.findUnique({
        where: { id },
        include: { workspace: true },
      });
      if (!note || note.workspace.userId !== ctx.userId)
        throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.note.update({ where: { id }, data });
    }),

  // Quick capture — creates a note with minimal input
  capture: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        title: z.string().min(1),
        category: z
          .enum(["INBOX", "PROJECT", "AREA", "RESOURCE", "ARCHIVE"])
          .default("INBOX"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const ws = await ctx.db.workspace.findUnique({
        where: { id: input.workspaceId },
      });
      if (!ws || ws.userId !== ctx.userId)
        throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.note.create({
        data: {
          workspaceId: input.workspaceId,
          title: input.title,
          category: input.category,
        },
      });
    }),

  suggestCategory: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const note = await ctx.db.note.findUnique({
        where: { id: input.id },
        include: { workspace: true },
      });
      if (!note || note.workspace.userId !== ctx.userId)
        throw new TRPCError({ code: "NOT_FOUND" });
      const plainText = bodyToPlainText(note.body);
      return suggestParaCategory(note.title, plainText);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const note = await ctx.db.note.findUnique({
        where: { id: input.id },
        include: { workspace: true },
      });
      if (!note || note.workspace.userId !== ctx.userId)
        throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.note.delete({ where: { id: input.id } });
    }),
});
