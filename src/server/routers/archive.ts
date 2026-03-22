import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

// Archives are notes with category=ARCHIVE — no separate table needed.
// This router provides convenient queries over that slice.
export const archiveRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        limit: z.number().default(50),
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
        where: { workspaceId: input.workspaceId, category: "ARCHIVE" },
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

  // Move any note to archives
  archiveNote: protectedProcedure
    .input(z.object({ noteId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const note = await ctx.db.note.findUnique({
        where: { id: input.noteId },
        include: { workspace: true },
      });
      if (!note || note.workspace.userId !== ctx.userId)
        throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.note.update({
        where: { id: input.noteId },
        data: { category: "ARCHIVE", projectId: null, areaId: null, resourceId: null },
      });
    }),

  // Restore a note from archives back to its category
  restoreNote: protectedProcedure
    .input(
      z.object({
        noteId: z.string(),
        category: z.enum(["PROJECT", "AREA", "RESOURCE"]),
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
        data: { category: input.category },
      });
    }),
});
