import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { db } from "@/server/db";
import { getLocaleFromCookies, getDict } from "@/lib/get-locale";
import type { Note } from "@/generated/prisma/client";
import { Sidebar } from "@/components/layout/Sidebar";
import { NoteCard } from "@/components/ui/NoteCard";
import { NoteGroupList } from "@/components/notes/NoteGroupList";
import { ProjectStatusPicker } from "@/components/projects/ProjectStatusPicker";
import { PickedIcon } from "@/components/ui/PickedIcon";
import { type ParaCategory, type ProjectStatus } from "@/types";
import { Archive, Folder } from "@/components/ui/icons";
import Link from "next/link";

type CompletedProjectItem = {
  id: string;
  title: string;
  icon: string;
  status: string;
  _count: { notes: number };
  area: { id: string; title: string; icon: string } | null;
};

export default async function ArchivePage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { workspaceSlug } = await params;
  const [workspace, completedProjects, rawGroupedNotes] = await Promise.all([
    db.workspace.findUnique({
      where: { slug: workspaceSlug },
      include: {
        notes: {
          where: { category: "ARCHIVE" },
          orderBy: { updatedAt: "desc" },
          take: 50,
        },
      },
    }),
    db.project.findMany({
      where: {
        workspace: { slug: workspaceSlug, userId },
        status: "COMPLETED",
      },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { notes: true } },
        area: { select: { id: true, title: true, icon: true } },
      },
    }),
    db.noteGroup.findMany({
      where: {
        workspace: { slug: workspaceSlug, userId },
        category: "ARCHIVE",
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        notes: {
          where: { category: "ARCHIVE" },
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            title: true,
            icon: true,
            body: true,
            category: true,
            updatedAt: true,
            tags: true,
          },
        },
      },
    }),
  ]);

  if (!workspace || workspace.userId !== userId) notFound();

  const locale = await getLocaleFromCookies();
  const t = await getDict();
  const groupedNotes = rawGroupedNotes.filter((group) => group.notes.length >= 2);
  const groupedNoteIds = new Set(
    groupedNotes.flatMap((group) => group.notes.map((note) => note.id)),
  );
  const standaloneArchivedNotes = workspace.notes.filter(
    (note) => !groupedNoteIds.has(note.id),
  );
  const hasContent =
    standaloneArchivedNotes.length > 0 ||
    completedProjects.length > 0 ||
    groupedNotes.length > 0;
  const archiveProjects = completedProjects as CompletedProjectItem[];

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar workspaceSlug={workspaceSlug} workspaceName={workspace.name} workspaceId={workspace.id} locale={locale} />

      <main className="flex-1 overflow-y-auto bg-surface-dim">
        <div className="sticky top-0 z-10 flex h-14 items-center bg-surface-dim/80 px-8 backdrop-blur-md">
          <h1 className="font-headline text-2xl font-bold tracking-tight text-on-surface">
            {t.archive.title}
          </h1>
        </div>

        <div className="px-8 py-6 space-y-10">
          {!hasContent ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Archive size={48} className="text-on-surface-variant" />
              <p className="mt-4 font-headline text-lg font-semibold text-on-surface">
                {t.archive.emptyTitle}
              </p>
              <p className="mt-1 font-body text-sm text-on-surface-variant">
                {t.archive.emptyDescription}
              </p>
            </div>
          ) : (
            <>
              {/* ── Completed Projects ─────────────────────────── */}
              {completedProjects.length > 0 && (
                <section>
                  <div className="mb-4 flex items-center gap-3">
                    <span className="font-label text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">
                      {t.archive.completedProjects}
                    </span>
                    <span className="rounded bg-surface-container-high px-2 py-0.5 font-label text-[10px] font-bold text-on-surface-variant">
                      {completedProjects.length}
                    </span>
                  </div>

                  <div className="flex flex-col divide-y divide-surface-container-high rounded-xl bg-surface-container-lowest overflow-hidden shadow-[0_4px_20px_rgba(42,52,57,0.06)]">
                    {archiveProjects.map((project) => (
                      <div key={project.id} className="flex items-center gap-4 px-5 py-4">
                        {/* Icon */}
                        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-on-surface-variant">
                          {project.icon
                            ? <PickedIcon name={project.icon} size={16} />
                            : <Folder size={16} />}
                        </div>

                        {/* Title + area */}
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/${workspaceSlug}/projects/${project.id}`}
                            className="font-headline text-sm font-bold text-on-surface hover:text-primary transition-colors"
                          >
                            {project.title}
                          </Link>
                          {project.area && (
                            <p className="font-label text-[10px] text-on-surface-variant mt-0.5">
                              {project.area.title}
                            </p>
                          )}
                        </div>

                        {/* Note count */}
                        <span className="font-label text-[10px] text-on-surface-variant tabular-nums">
                          {project._count.notes} {project._count.notes === 1 ? t.archive.note_one : t.archive.note_other}
                        </span>

                        {/* Status picker — allows reactivating */}
                        <ProjectStatusPicker
                          projectId={project.id}
                          currentStatus={project.status as ProjectStatus}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {groupedNotes.length > 0 && (
                <NoteGroupList title={t.common.groupedNotes} groups={groupedNotes} />
              )}

              {/* ── Archived Notes ─────────────────────────────── */}
              {standaloneArchivedNotes.length > 0 && (
                <section>
                  <div className="mb-4 flex items-center gap-3">
                    <span className="font-label text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">
                      {t.archive.archivedNotes}
                    </span>
                    <span className="rounded bg-surface-container-high px-2 py-0.5 font-label text-[10px] font-bold text-on-surface-variant">
                      {standaloneArchivedNotes.length}
                    </span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {standaloneArchivedNotes.map((note: Note) => (
                      <NoteCard
                        key={note.id}
                        id={note.id}
                        title={note.title}
                        icon={note.icon}
                        body={note.body}
                        category={note.category as ParaCategory}
                        updatedAt={note.updatedAt}
                        tags={note.tags}
                      />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
