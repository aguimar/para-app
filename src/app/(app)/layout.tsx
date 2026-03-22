import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { slugify } from "@/lib/utils";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  // Upsert user + default workspace — handles cases where webhook hasn't fired yet
  let user = await db.user.findUnique({
    where: { id: userId },
    include: { workspaces: { take: 1, orderBy: { createdAt: "asc" } } },
  });

  if (!user) {
    const clerkUser = await currentUser();
    const email = clerkUser?.emailAddresses[0]?.emailAddress ?? "";
    const name =
      [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") ||
      email;
    const baseSlug = slugify(name || "my-brain");
    const slug = `${baseSlug}-${userId.slice(-6)}`;

    user = await db.user.create({
      data: {
        id: userId,
        email,
        name,
        imageUrl: clerkUser?.imageUrl,
        workspaces: { create: { name: "My Second Brain", slug } },
      },
      include: { workspaces: { take: 1, orderBy: { createdAt: "asc" } } },
    });
  }

  return <>{children}</>;
}
