import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { slugify } from "@/lib/utils";
import { getDict, getLocaleFromCookies } from "@/lib/get-locale";
import { DictionaryProvider } from "@/components/providers/DictionaryProvider";

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

    // Check if user exists by email (handles Clerk dev→prod ID change)
    const existingByEmail = await db.user.findUnique({ where: { email } });
    if (existingByEmail) {
      user = await db.user.update({
        where: { email },
        data: { id: userId, name, imageUrl: clerkUser?.imageUrl },
        include: { workspaces: { take: 1, orderBy: { createdAt: "asc" } } },
      });
    } else {
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
  }

  const dictionary = await getDict();

  return (
    <DictionaryProvider dictionary={dictionary}>
      {children}
    </DictionaryProvider>
  );
}
