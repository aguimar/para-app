import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { db } from "@/server/db";
import type { Note } from "@/generated/prisma/client";
import { Sidebar } from "@/components/layout/Sidebar";
import { NoteCard } from "@/components/ui/NoteCard";
import { type ParaCategory } from "@/types";

export default async function ArchivePage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { workspaceSlug } = await params;
  const workspace = await db.workspace.findUnique({
    where: { slug: workspaceSlug },
    include: {
      notes: {
        where: { category: "ARCHIVE" },
        orderBy: { updatedAt: "desc" },
        take: 50,
      },
    },
  });

  if (!workspace || workspace.userId !== userId) notFound();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar workspaceSlug={workspaceSlug} workspaceName={workspace.name} />

      {/* Archive uses surface-dim to signal "historical" content */}
      <main className="flex-1 overflow-y-auto bg-surface-dim">
        <div className="sticky top-0 z-10 flex h-14 items-center bg-surface-dim/80 px-8 backdrop-blur-md">
          <h1 className="font-headline text-2xl font-bold tracking-tight text-on-surface">
            Archive
          </h1>
        </div>

        <div className="px-8 py-6">
          {workspace.notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <span className="material-symbols-outlined text-[48px] text-on-surface-variant">
                inventory_2
              </span>
              <p className="mt-4 font-headline text-lg font-semibold text-on-surface">
                Nothing archived yet
              </p>
              <p className="mt-1 font-body text-sm text-on-surface-variant">
                Archived items are inactive notes from Projects, Areas, and Resources.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {workspace.notes.map((note: Note) => (
                <NoteCard
                  key={note.id}
                  id={note.id}
                  title={note.title}
                  icon={(note as any).icon}
                  body={note.body}
                  category={note.category as ParaCategory}
                  updatedAt={note.updatedAt}
                  tags={note.tags}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
