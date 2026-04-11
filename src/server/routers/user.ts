import { z } from "zod";
import { router, protectedProcedure } from "../trpc";

export const userRouter = router({
  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        imageUrl: true,
        googleAccessToken: true,
      },
    });
    if (!user) return null;
    const { googleAccessToken, ...rest } = user;
    return { ...rest, isGoogleConnected: !!googleAccessToken };
  }),

  updatePhone: protectedProcedure
    .input(z.object({ phone: z.string().nullable() }))
    .mutation(async ({ ctx, input }) => {
      const cleaned = input.phone?.replace(/\D/g, "") || null;
      return ctx.db.user.update({
        where: { id: ctx.userId },
        data: { phone: cleaned },
        select: { id: true, phone: true },
      });
    }),
});
