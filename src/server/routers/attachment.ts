import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { deleteFile } from "@/lib/storage";

export const attachmentRouter = router({
  list: protectedProcedure
    .input(z.object({ noteId: z.string() }))
    .query(async ({ ctx, input }) => {
      const note = await ctx.db.note.findUnique({
        where: { id: input.noteId },
        include: { workspace: true },
      });
      if (!note || note.workspace.userId !== ctx.userId)
        throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.db.attachment.findMany({
        where: { noteId: input.noteId },
        orderBy: { createdAt: "asc" },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const attachment = await ctx.db.attachment.findUnique({
        where: { id: input.id },
        include: { note: { include: { workspace: true } } },
      });
      if (!attachment || attachment.note.workspace.userId !== ctx.userId)
        throw new TRPCError({ code: "NOT_FOUND" });

      await deleteFile(attachment.storedAs);
      await ctx.db.attachment.delete({ where: { id: input.id } });
    }),
});
