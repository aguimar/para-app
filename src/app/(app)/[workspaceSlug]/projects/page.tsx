import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { db } from "@/server/db";
import type { Project } from "@/generated/prisma/client";
import { Sidebar } from "@/components/layout/Sidebar";
import { NewProjectButton } from "@/components/projects/NewProjectButton";
import { AttachNotePanel } from "@/components/projects/AttachNotePanel";
import { IconPicker } from "@/components/ui/IconPicker";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { type ProjectPriority, type ProjectStatus } from "@/types";

const PRIORITY_STYLES: Record<ProjectPriority, { badge: string; border: string; bar: string }> = {
  HIGH:   { badge: "bg-error-container text-on-error-container",           border: "border-l-4 border-primary",   bar: "bg-primary" },
  MEDIUM: { badge: "bg-secondary-container text-on-secondary-container",   border: "border-l-4 border-secondary", bar: "bg-secondary" },
  LOW:    { badge: "bg-surface-container-highest text-on-surface-variant", border: "border-l-4 border-outline",   bar: "bg-outline" },
};

export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { workspaceSlug } = await params;
  const [workspace, unattachedNotes] = await Promise.all([
    db.workspace.findUnique({
      where: { slug: workspaceSlug },
      include: {
        projects: {
          orderBy: { updatedAt: "desc" },
          include: { _count: { select: { notes: true } } },
        },
      },
    }),
    db.note.findMany({
      where: {
        workspace: { slug: workspaceSlug, userId },
        category: "PROJECT",
        projectId: null,
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  if (!workspace || workspace.userId !== userId) notFound();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar workspaceSlug={workspaceSlug} workspaceName={workspace.name} />

      <main className="flex-1 overflow-y-auto bg-surface">
        <div className="mx-auto max-w-6xl px-8 py-12">

          {/* Page header */}
          <header className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center rounded bg-primary-container px-3 py-1 font-label text-[11px] font-bold uppercase tracking-widest text-on-primary-container">
                Active Initiatives
              </div>
              <h1 className="font-headline text-4xl font-bold tracking-tight text-on-surface">
                Projects
              </h1>
              <p className="mt-2 max-w-md font-body text-sm leading-relaxed text-on-surface-variant">
                Organize your current focus areas. These are time-bound efforts with a specific outcome in mind.
              </p>
            </div>

            {/* Grid/list toggle + new project */}
            <div className="flex items-center gap-4">
              <div className="flex rounded-xl bg-surface-container-low p-1">
                <button className="rounded-lg bg-surface-container-lowest px-4 py-2 text-primary shadow-ambient">
                  <span className="material-symbols-outlined block text-[20px]">grid_view</span>
                </button>
                <button className="px-4 py-2 text-on-surface-variant">
                  <span className="material-symbols-outlined block text-[20px]">list</span>
                </button>
              </div>
              <NewProjectButton workspaceId={workspace.id} variant="sidebar" />
            </div>
          </header>

          {/* Projects grid */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {workspace.projects.map((project: Project & { _count: { notes: number } }) => {
              const priority = (project.priority ?? "MEDIUM") as ProjectPriority;
              const styles = PRIORITY_STYLES[priority];

              return (
                <div
                  key={project.id}
                  className={`group relative flex flex-col rounded-xl bg-surface-container-lowest p-6 shadow-ambient transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_48px_rgba(42,52,57,0.10)] ${styles.border}`}
                >
                  {/* Icon picker — outside Link to avoid nav on click */}
                  <div className="mb-4">
                    <IconPicker
                      entityType="project"
                      entityId={project.id}
                      currentIcon={project.icon}
                      entityTitle={project.title}
                      accentClass="text-primary"
                      bgClass="bg-primary-container/20"
                    />
                  </div>

                  {/* Clickable area navigates to detail */}
                  <Link href={`/${workspaceSlug}/projects/${project.id}`} className="flex flex-col flex-1">
                    {/* Due date + priority */}
                    <div className="mb-6 flex items-start justify-between">
                      <span className="font-label text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
                        {project.deadline ? `Due ${formatDate(project.deadline)}` : "No deadline"}
                      </span>
                      <span className={`rounded px-2 py-0.5 font-label text-[10px] font-bold uppercase tracking-wide ${styles.badge}`}>
                        {priority.charAt(0) + priority.slice(1).toLowerCase()}
                      </span>
                    </div>

                    {/* Title + description */}
                    <h3 className="mb-3 font-headline text-xl font-bold leading-snug text-on-surface group-hover:text-primary transition-colors">
                      {project.title}
                    </h3>
                    {project.description && (
                      <p className="mb-8 line-clamp-2 font-body text-sm text-on-surface-variant">
                        {project.description}
                      </p>
                    )}

                    {/* Progress */}
                    <div className="mt-auto">
                      <div className="mb-2 flex justify-between font-label text-[11px] font-bold uppercase tracking-widest text-on-surface">
                        <span>Progress</span>
                        <span>{project.progress}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
                        <div
                          className={`h-full rounded-full transition-all ${styles.bar}`}
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}

            {/* Initiate New Project card */}
            <NewProjectButton workspaceId={workspace.id} variant="card" />
          </div>

          {/* Unattached PROJECT notes */}
          <AttachNotePanel
            notes={unattachedNotes}
            projects={workspace.projects.map((p) => ({ id: p.id, title: p.title, icon: p.icon }))}
          />
        </div>
      </main>
    </div>
  );
}
