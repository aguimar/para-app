import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { db } from "@/server/db";
import type { Note } from "@/generated/prisma/client";
import { Sidebar } from "@/components/layout/Sidebar";
import { NoteCard } from "@/components/ui/NoteCard";
import { IconPicker } from "@/components/ui/IconPicker";
import { type ParaCategory, type ProjectStatus } from "@/types";
import { formatDate } from "@/lib/utils";
import { ArrowLeft } from "@phosphor-icons/react";

const STATUS_LABELS: Record<ProjectStatus, string> = {
  ACTIVE: "Active",
  ON_HOLD: "On Hold",
  COMPLETED: "Completed",
};

export default async function ProjectDetailPage({
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

  const project = await db.project.findUnique({
    where: { id, workspaceId: workspace.id },
    include: { notes: { orderBy: { updatedAt: "desc" } } },
  });
  if (!project) notFound();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar workspaceSlug={workspaceSlug} workspaceName={workspace.name} />

      <main className="flex-1 overflow-y-auto bg-surface">
        <div className="sticky top-0 z-10 flex h-14 items-center gap-4 bg-surface/80 px-8 backdrop-blur-md">
          <a
            href={`/${workspaceSlug}/projects`}
            className="text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <ArrowLeft size={20} />
          </a>
          <IconPicker
            entityType="project"
            entityId={project.id}
            currentIcon={project.icon}
            entityTitle={project.title}
            accentClass="text-primary"
            bgClass="bg-primary-container/20"
          />
          <h1 className="font-headline text-xl font-bold tracking-tight text-on-surface">
            {project.title}
          </h1>
        </div>

        <div className="px-8 py-6 space-y-8">
          {/* Project meta */}
          <div className="rounded-xl bg-surface-container-lowest p-6 shadow-ambient">
            {project.description && (
              <p className="font-body text-sm text-on-surface-variant mb-6">
                {project.description}
              </p>
            )}

            <div className="flex flex-wrap gap-6">
              <div>
                <p className="font-label text-[11px] uppercase tracking-widest text-on-surface-variant">
                  Status
                </p>
                <p className="mt-1 font-body text-sm font-medium text-on-surface">
                  {STATUS_LABELS[project.status as ProjectStatus]}
                </p>
              </div>
              <div>
                <p className="font-label text-[11px] uppercase tracking-widest text-on-surface-variant">
                  Progress
                </p>
                <div className="mt-1 flex items-center gap-3">
                  <div className="w-24 h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                  <span className="font-body text-sm text-on-surface">
                    {project.progress}%
                  </span>
                </div>
              </div>
              {project.deadline && (
                <div>
                  <p className="font-label text-[11px] uppercase tracking-widest text-on-surface-variant">
                    Deadline
                  </p>
                  <p className="mt-1 font-body text-sm font-medium text-on-surface">
                    {formatDate(project.deadline)}
                  </p>
                </div>
              )}
              <div>
                <p className="font-label text-[11px] uppercase tracking-widest text-on-surface-variant">
                  Notes
                </p>
                <p className="mt-1 font-body text-sm font-medium text-on-surface">
                  {project.notes.length}
                </p>
              </div>
            </div>
          </div>

          {/* Notes */}
          <section>
            <h2 className="font-headline text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-4">
              Notes
            </h2>
            {project.notes.length === 0 ? (
              <p className="font-body text-sm text-on-surface-variant">
                No notes in this project yet.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {project.notes.map((note: Note) => (
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
