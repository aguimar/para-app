import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { db } from "@/server/db";
import { Sidebar } from "@/components/layout/Sidebar";
import { NewProjectButton } from "@/components/projects/NewProjectButton";
import { AttachNotePanel } from "@/components/projects/AttachNotePanel";
import { ProjectsView } from "@/components/projects/ProjectsView";
import { getDict, getLocaleFromCookies } from "@/lib/get-locale";

export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { workspaceSlug } = await params;
  const [t, locale, workspace, unattachedNotes] = await Promise.all([
    getDict(),
    getLocaleFromCookies(),
    db.workspace.findUnique({
      where: { slug: workspaceSlug },
      include: {
        projects: {
          orderBy: { updatedAt: "desc" },
          include: {
            _count: { select: { notes: true } },
            area: { select: { id: true, title: true, icon: true } },
          },
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
      <Sidebar workspaceSlug={workspaceSlug} workspaceName={workspace.name} workspaceId={workspace.id} locale={locale} />

      <main className="flex-1 overflow-y-auto bg-surface">
        <div className="mx-auto max-w-6xl px-8 py-12">

          {/* Page header */}
          <header className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center rounded bg-primary-container px-3 py-1 font-label text-[11px] font-bold uppercase tracking-widest text-on-primary-container">
                {t.projects.badge}
              </div>
              <h1 className="font-headline text-4xl font-bold tracking-tight text-on-surface">
                {t.projects.title}
              </h1>
              <p className="mt-2 max-w-md font-body text-sm leading-relaxed text-on-surface-variant">
                {t.projects.description}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <NewProjectButton workspaceId={workspace.id} variant="sidebar" />
            </div>
          </header>

          {/* Projects grid / list (toggle managed client-side) */}
          <ProjectsView
            projects={workspace.projects as any}
            workspaceId={workspace.id}
            workspaceSlug={workspaceSlug}
          />

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
