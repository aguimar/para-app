import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const commentRouter = router({
  list: protectedProcedure
    .input(z.object({ noteId: z.string() }))
    .query(async ({ ctx, input }) => {
      const note = await ctx.db.note.findUnique({
        where: { id: input.noteId },
        include: { workspace: true },
      });
      if (!note || note.workspace.userId !== ctx.userId)
        throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.db.noteComment.findMany({
        where: { noteId: input.noteId },
        orderBy: { createdAt: "asc" },
      });
    }),

  create: protectedProcedure
    .input(z.object({ noteId: z.string(), body: z.string().min(1).max(2000) }))
    .mutation(async ({ ctx, input }) => {
      const note = await ctx.db.note.findUnique({
        where: { id: input.noteId },
        include: { workspace: true },
      });
      if (!note || note.workspace.userId !== ctx.userId)
        throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.db.noteComment.create({
        data: { noteId: input.noteId, body: input.body },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const comment = await ctx.db.noteComment.findUnique({
        where: { id: input.id },
        include: { note: { include: { workspace: true } } },
      });
      if (!comment || comment.note.workspace.userId !== ctx.userId)
        throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.db.noteComment.delete({ where: { id: input.id } });
    }),
});
