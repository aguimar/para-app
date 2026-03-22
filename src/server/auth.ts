import { auth, currentUser } from "@clerk/nextjs/server";
import { TRPCError } from "@trpc/server";

export { auth, currentUser };

export async function getAuthUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new TRPCError({ code: "UNAUTHORIZED" });
  return userId;
}
