import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { db } from "@/server/db";
import type { Note } from "@/generated/prisma/client";
import { Sidebar } from "@/components/layout/Sidebar";
import { NoteCard } from "@/components/ui/NoteCard";
import { IconPicker } from "@/components/ui/IconPicker";
import { type ParaCategory } from "@/types";
import { ArrowLeft } from "@/components/ui/icons";
import { getLocaleFromCookies } from "@/lib/get-locale";

export default async function AreaDetailPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { workspaceSlug, id } = await params;

  const workspace = await db.workspace.findUnique({
    where: { slug: workspaceSlug },
  });
  if (!workspace || workspace.userId !== userId) notFound();

  const area = await db.area.findUnique({
    where: { id, workspaceId: workspace.id },
    include: {
      notes: { orderBy: { updatedAt: "desc" } },
      projects: {
        where: { status: "ACTIVE" },
        orderBy: { updatedAt: "desc" },
        include: { _count: { select: { notes: true } } },
      },
    },
  });
  if (!area) notFound();

  const locale = await getLocaleFromCookies();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar workspaceSlug={workspaceSlug} workspaceName={workspace.name} locale={locale} />

      <main className="flex-1 overflow-y-auto bg-surface">
        <div className="sticky top-0 z-10 flex h-14 items-center gap-4 bg-surface/80 px-8 backdrop-blur-md">
          <a
            href={`/${workspaceSlug}/areas`}
            className="text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <ArrowLeft size={20} />
          </a>
          <IconPicker
            entityType="area"
            entityId={area.id}
            currentIcon={area.icon}
            entityTitle={area.title}
            accentClass="text-secondary"
            bgClass="bg-secondary-container/20"
          />
          <h1 className="font-headline text-xl font-bold tracking-tight text-on-surface">
            {area.title}
          </h1>
        </div>

        <div className="px-8 py-6 space-y-8">
          {area.description && (
            <p className="font-body text-sm text-on-surface-variant">
              {area.description}
            </p>
          )}

          {/* Projects in this Area */}
          {area.projects.length > 0 && (
            <section>
              <h2 className="font-headline text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-4">
                Active Projects ({area.projects.length})
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {area.projects.map((project) => (
                  <a
                    key={project.id}
                    href={`/${workspaceSlug}/projects/${project.id}`}
                    className="group flex flex-col rounded-xl bg-surface-container-lowest p-4 shadow-ambient transition hover:bg-surface-container-low hover:shadow-[0_8px_24px_rgba(42,52,57,0.08)]"
                  >
                    <h3 className="font-headline text-sm font-semibold text-on-surface group-hover:text-primary transition-colors">
                      {project.title}
                    </h3>
                    {project.description && (
                      <p className="mt-1 font-body text-xs text-on-surface-variant line-clamp-2">
                        {project.description}
                      </p>
                    )}
                    <p className="mt-2 font-label text-[10px] uppercase tracking-wider text-on-surface-variant">
                      {project._count.notes} notes
                    </p>
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Notes in this Area */}
          <section>
            <h2 className="font-headline text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-4">
              Notes ({area.notes.length})
            </h2>
            {area.notes.length === 0 ? (
              <p className="font-body text-sm text-on-surface-variant">
                No notes in this area yet.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {area.notes.map((note: Note) => (
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
          </section>
        </div>
      </main>
    </div>
  );
}