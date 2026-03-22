import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { Sidebar } from "@/components/layout/Sidebar";
import { NoteCard } from "@/components/ui/NoteCard";
import { ProjectCard } from "@/components/ui/ProjectCard";
import { type ParaCategory, type ProjectStatus } from "@/types";
import type { Project, Note } from "@/generated/prisma/client";
import { NewNoteButton } from "@/components/notes/NewNoteButton";
import { InboxBoard } from "@/components/notes/InboxBoard";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      workspaces: {
        take: 1,
        orderBy: { createdAt: "asc" },
        include: {
          projects: {
            where: { status: "ACTIVE" },
            take: 6,
            orderBy: { updatedAt: "desc" },
            include: { _count: { select: { notes: true } } },
          },
          areas: { orderBy: { updatedAt: "desc" }, take: 10 },
          resources: { orderBy: { updatedAt: "desc" }, take: 10 },
          notes: {
            take: 8,
            orderBy: { updatedAt: "desc" },
            where: { category: { not: "INBOX" } },
          },
          _count: {
            select: {
              projects: true,
              areas: true,
              resources: true,
              notes: { where: { category: "ARCHIVE" } },
            },
          },
        },
      },
    },
  });

  const workspace = user?.workspaces[0];
  if (!workspace) redirect("/sign-in");

  const inboxNotes = await db.note.findMany({
    where: { workspaceId: workspace.id, category: "INBOX" },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, updatedAt: true },
  });

  const inventory = [
    { label: "Projects", count: workspace._count.projects, icon: "rocket_launch", color: "text-primary" },
    { label: "Areas", count: workspace._count.areas, icon: "hub", color: "text-secondary" },
    { label: "Resources", count: workspace._count.resources, icon: "book_2", color: "text-tertiary" },
    { label: "Archives", count: workspace._count.notes, icon: "inventory_2", color: "text-outline" },
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar workspaceSlug={workspace.slug} workspaceName={workspace.name} />

      <main className="flex-1 overflow-y-auto bg-surface">
        {/* Top bar */}
        <div className="sticky top-0 z-10 flex h-14 items-center justify-between bg-surface/80 px-8 backdrop-blur-md">
          <h1 className="font-headline text-2xl font-bold tracking-tight text-on-surface">
            Dashboard
          </h1>
          <NewNoteButton workspaceId={workspace.id} />
        </div>

        <div className="px-8 py-6 space-y-10">
          {/* PARA Inventory */}
          <section>
            <h2 className="font-headline text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-4">
              PARA Inventory
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {inventory.map(({ label, count, icon, color }) => (
                <div
                  key={label}
                  className="rounded-xl bg-surface-container-lowest p-4 shadow-ambient"
                >
                  <span className={`material-symbols-outlined text-[22px] ${color}`}>
                    {icon}
                  </span>
                  <p className="mt-2 font-headline text-2xl font-bold text-on-surface">
                    {count}
                  </p>
                  <p className="font-label text-[11px] uppercase tracking-widest text-on-surface-variant">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Inbox — drag notes to categorize */}
          {inboxNotes.length > 0 && (
            <InboxBoard
              workspaceId={workspace.id}
              inboxNotes={inboxNotes}
            />
          )}

          {/* Active Projects */}
          {workspace.projects.length > 0 && (
            <section>
              <h2 className="font-headline text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-4">
                Active Projects
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {workspace.projects.map((project: Project & { _count: { notes: number } }) => (
                  <ProjectCard
                    key={project.id}
                    id={project.id}
                    workspaceSlug={workspace.slug}
                    title={project.title}
                    description={project.description}
                    status={project.status as ProjectStatus}
                    progress={project.progress}
                    deadline={project.deadline}
                    noteCount={project._count.notes}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Recent Notes */}
          {workspace.notes.length > 0 && (
            <section>
              <h2 className="font-headline text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-4">
                Recent Notes
              </h2>
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
            </section>
          )}

          {workspace.projects.length === 0 && workspace.notes.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <span className="material-symbols-outlined text-[48px] text-on-surface-variant">
                auto_stories
              </span>
              <p className="mt-4 font-headline text-lg font-semibold text-on-surface">
                Your second brain is empty
              </p>
              <p className="mt-1 font-body text-sm text-on-surface-variant">
                Start by capturing a thought or creating a project.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
