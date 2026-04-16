import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import type { db as dbType } from "../db";

type Ctx = { db: typeof dbType; userId: string };

async function assertGroupOwned(ctx: Ctx, groupId: string) {
  const group = await ctx.db.noteGroup.findUnique({
    where: { id: groupId },
    include: { workspace: true },
  });
  if (!group || group.workspace.userId !== ctx.userId) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }
  return group;
}

async function assertNoteOwned(ctx: Ctx, noteId: string) {
  const note = await ctx.db.note.findUnique({
    where: { id: noteId },
    include: { workspace: true },
  });
  if (!note || note.workspace.userId !== ctx.userId) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }
  return note;
}

export const noteGroupRouter = router({
  createFromNotes: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        noteIds: z.array(z.string()).min(2),
        title: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const ws = await ctx.db.workspace.findUnique({ where: { id: input.workspaceId } });
      if (!ws || ws.userId !== ctx.userId) throw new TRPCError({ code: "NOT_FOUND" });

      const notes = await ctx.db.note.findMany({
        where: { id: { in: input.noteIds }, workspaceId: input.workspaceId },
      });
      if (notes.length !== input.noteIds.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Note not found in workspace" });
      }

      const group = await ctx.db.noteGroup.create({
        data: {
          workspaceId: input.workspaceId,
          title: input.title ?? "Unnamed group",
        },
      });
      await ctx.db.note.updateMany({
        where: { id: { in: input.noteIds } },
        data: { groupId: group.id },
      });
      return group;
    }),

  rename: protectedProcedure
    .input(z.object({ id: z.string(), title: z.string().min(1).max(200) }))
    .mutation(async ({ ctx, input }) => {
      await assertGroupOwned(ctx, input.id);
      return ctx.db.noteGroup.update({
        where: { id: input.id },
        data: { title: input.title },
      });
    }),

  addNote: protectedProcedure
    .input(z.object({ groupId: z.string(), noteId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const group = await assertGroupOwned(ctx, input.groupId);
      const note = await assertNoteOwned(ctx, input.noteId);
      if (note.workspaceId !== group.workspaceId) {
        throw new TRPCError({ code: "BAD_REQUEST" });
      }
      return ctx.db.note.update({
        where: { id: input.noteId },
        data: { groupId: input.groupId },
      });
    }),

  assign: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        category: z.enum(["PROJECT", "AREA", "RESOURCE", "ARCHIVE"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertGroupOwned(ctx, input.id);

      await ctx.db.noteGroup.update({
        where: { id: input.id },
        data: { category: input.category },
      });

      await ctx.db.note.updateMany({
        where: { groupId: input.id },
        data: {
          category: input.category,
          projectId: null,
          areaId: null,
          resourceId: null,
        },
      });

      return { ok: true };
    }),

  removeNote: protectedProcedure
    .input(z.object({ noteId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const note = await assertNoteOwned(ctx, input.noteId);
      if (!note.groupId) return { ok: true };
      const groupId = note.groupId;

      await ctx.db.note.update({ where: { id: input.noteId }, data: { groupId: null } });
      const remaining = await ctx.db.note.findMany({ where: { groupId } });
      if (remaining.length < 2) {
        await ctx.db.note.updateMany({ where: { groupId }, data: { groupId: null } });
        await ctx.db.noteGroup.delete({ where: { id: groupId } });
      }
      return { ok: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertGroupOwned(ctx, input.id);
      await ctx.db.note.updateMany({ where: { groupId: input.id }, data: { groupId: null } });
      await ctx.db.noteGroup.delete({ where: { id: input.id } });
      return { ok: true };
    }),
});
