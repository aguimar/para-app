import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { db } from "@/server/db";
import type { Note } from "@/generated/prisma/client";
import { Sidebar } from "@/components/layout/Sidebar";
import { NoteCard } from "@/components/ui/NoteCard";
import { IconPicker } from "@/components/ui/IconPicker";
import { type ParaCategory, type ProjectStatus } from "@/types";
import { formatDate } from "@/lib/utils";
import { ArrowLeft } from "@/components/ui/icons";
import Link from "next/link";
import { ProjectAreaPicker } from "@/components/projects/ProjectAreaPicker";

import { ProjectKanbanBoard } from "@/components/projects/ProjectKanbanBoard";

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

  const [project, workspaceAreas] = await Promise.all([
    db.project.findUnique({
      where: { id, workspaceId: workspace.id },
      select: {
        id: true,
        title: true,
        icon: true,
        description: true,
        status: true,
        progress: true,
        deadline: true,
        areaId: true,
        area: { select: { id: true, title: true, icon: true } },
        notes: { orderBy: { updatedAt: "desc" } },
      },
    }),
    db.area.findMany({
      where: { workspaceId: workspace.id },
      select: { id: true, title: true, icon: true },
      orderBy: { title: "asc" },
    }),
  ]);
  if (!project) notFound();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar workspaceSlug={workspaceSlug} workspaceName={workspace.name} />

      <main className="flex-1 overflow-y-auto bg-surface">
        <div className="sticky top-0 z-10 flex h-14 items-center gap-4 bg-surface/80 px-8 backdrop-blur-md border-b border-outline-variant/10">
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

        <div className="px-8 py-8 space-y-10">
          {/* Project meta */}
          <div className="rounded-xl bg-surface-container-lowest p-6 shadow-[0_12px_40px_rgba(42,52,57,0.06)] flex flex-col md:flex-row gap-8">
            <div className="flex-1">
              {project.description && (
                <p className="font-body text-sm text-on-surface-variant mb-6 leading-relaxed">
                  {project.description}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-6 md:min-w-[400px]">
              <div>
                <p className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  Status
                </p>
                <span className="mt-1.5 inline-block rounded-md bg-surface-container-high px-2 py-0.5 font-label text-[11px] font-bold text-on-surface">
                  {STATUS_LABELS[project.status as ProjectStatus]}
                </span>
              </div>
              <div>
                <p className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  Progress
                </p>
                <div className="mt-1 flex items-center gap-3">
                  <div className="w-full h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                  <span className="font-label text-[11px] font-bold text-on-surface">
                    {project.progress}%
                  </span>
                </div>
              </div>
              {project.deadline && (
                <div>
                  <p className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    Deadline
                  </p>
                  <p className="mt-1.5 font-label text-sm font-semibold text-on-surface">
                    {formatDate(project.deadline)}
                  </p>
                </div>
              )}
              <div>
                <p className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  Linked Area
                </p>
                <div className="mt-1.5">
                  <ProjectAreaPicker
                    projectId={project.id}
                    workspaceId={workspace.id}
                    currentAreaId={project.areaId}
                    areas={workspaceAreas}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Kanban Board */}
          <section className="space-y-4">
            <header className="flex items-center justify-between">
              <h2 className="font-headline text-lg font-bold text-on-surface">
                Knowledge Kanban
              </h2>
              <span className="bg-surface-container-highest px-3 py-1 rounded-full font-label text-[10px] font-bold uppercase tracking-widest text-on-surface">
                {project.notes.length} Active Notes
              </span>
            </header>
            
            {project.notes.length === 0 ? (
              <div className="py-12 text-center rounded-xl border border-dashed border-outline-variant/30 bg-surface-container-lowest/50">
                <p className="font-body text-sm text-on-surface-variant">
                  No notes in this project yet. Start capturing thoughts to build your knowledge flow.
                </p>
              </div>
            ) : (
              <div className="-mx-8 px-8 pb-8 overflow-x-auto no-scrollbar">
                <ProjectKanbanBoard initialNotes={project.notes as any[]} />
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
