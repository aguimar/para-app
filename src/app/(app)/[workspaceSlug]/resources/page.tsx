import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { db } from "@/server/db";
import type { Resource } from "@/generated/prisma/client";
import { Sidebar } from "@/components/layout/Sidebar";
import { AttachResourceNotePanel } from "@/components/resources/AttachResourceNotePanel";
import { NewResourceButton } from "@/components/resources/NewResourceButton";
import { ResourcesView } from "@/components/resources/ResourcesView";
import { getLocaleFromCookies, getDict } from "@/lib/get-locale";

export default async function ResourcesPage({
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
        resources: {
          orderBy: { title: "asc" },
          include: {
            _count: { select: { notes: true } },
            area: { select: { id: true, title: true, icon: true } },
          },
        },
        areas: { select: { id: true, title: true, icon: true }, orderBy: { title: "asc" } },
      },
    }),
    db.note.findMany({
      where: {
        workspace: { slug: workspaceSlug, userId },
        category: "RESOURCE",
        resourceId: null,
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  if (!workspace || workspace.userId !== userId) notFound();

  const locale = await getLocaleFromCookies();
  const t = await getDict();

  type AreaSnippet = { id: string; title: string; icon: string };
  const resources = workspace.resources as (Resource & { _count: { notes: number }; area: AreaSnippet | null })[];
  const areas = workspace.areas as AreaSnippet[];

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar workspaceSlug={workspaceSlug} workspaceName={workspace.name} workspaceId={workspace.id} locale={locale} />

      <main className="flex-1 overflow-y-auto bg-surface">

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="mx-auto max-w-5xl px-10 pt-14 pb-0">
          <div className="flex items-end justify-between border-b border-surface-container-high pb-8">
            <div className="flex flex-col gap-3">
              <span className="font-label text-[10px] font-bold uppercase tracking-[0.2em] text-tertiary">
                {t.resources.badge}
              </span>
              <h1 className="font-headline text-5xl font-bold leading-none tracking-tight text-on-surface">
                {t.resources.title}
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <p className="font-body text-sm text-on-surface-variant">
                {resources.length} {resources.length === 1 ? t.resources.topic_one : t.resources.topic_other}
              </p>
              <NewResourceButton workspaceId={workspace.id} />
            </div>
          </div>
        </div>

        {/* ── Index list ─────────────────────────────────────────── */}
        <ResourcesView resources={resources} workspaceSlug={workspaceSlug} />

        {/* ── Unattached resource notes ───────────────────────────── */}
        {unattachedNotes.length > 0 && (
          <div className="mx-auto max-w-5xl px-10 pb-16">
            <div className="mb-4 flex items-center gap-3 border-t border-surface-container-high pt-10">
              <span className="font-label text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">
                {t.resources.unattachedNotes}
              </span>
              <span className="rounded bg-surface-container-high px-2 py-0.5 font-label text-[10px] font-bold text-on-surface-variant">
                {unattachedNotes.length}
              </span>
            </div>
            <AttachResourceNotePanel
              notes={unattachedNotes}
              resources={resources.map((r) => ({ id: r.id, title: r.title, icon: r.icon }))}
            />
          </div>
        )}
      </main>
    </div>
  );
}
