import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { db } from "@/server/db";
import { Sidebar } from "@/components/layout/Sidebar";
import { AttachAreaNotePanel } from "@/components/areas/AttachAreaNotePanel";
import { NewAreaButton } from "@/components/areas/NewAreaButton";
import { AreasView } from "@/components/areas/AreasView";
import { NoteGroupList } from "@/components/notes/NoteGroupList";
import { getDict, getLocaleFromCookies } from "@/lib/get-locale";

type AreaListItem = {
  id: string;
  title: string;
  icon: string;
  description: string | null;
  _count: { notes: number; projects: number; resources: number };
};

export default async function AreasPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { workspaceSlug } = await params;
  const [t, locale, workspace, unattachedNotes, rawGroupedNotes] = await Promise.all([
    getDict(),
    getLocaleFromCookies(),
    db.workspace.findUnique({
      where: { slug: workspaceSlug },
      include: {
        areas: {
          orderBy: { updatedAt: "desc" },
          include: { _count: { select: { notes: true, projects: true, resources: true } } },
        },
      },
    }),
    db.note.findMany({
      where: {
        workspace: { slug: workspaceSlug, userId },
        category: "AREA",
        areaId: null,
      },
      orderBy: { updatedAt: "desc" },
    }),
    db.noteGroup.findMany({
      where: {
        workspace: { slug: workspaceSlug, userId },
        category: "AREA",
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        notes: {
          where: { category: "AREA" },
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

  const groupedNotes = rawGroupedNotes.filter((group) => group.notes.length >= 2);

  if (!workspace || workspace.userId !== userId) notFound();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar workspaceSlug={workspaceSlug} workspaceName={workspace.name} workspaceId={workspace.id} locale={locale} />

      <main className="flex-1 overflow-y-auto bg-surface">
        <div className="sticky top-0 z-10 flex h-14 items-center justify-between bg-surface/80 px-8 backdrop-blur-md">
          <h1 className="font-headline text-2xl font-bold tracking-tight text-on-surface">
            {t.areas.title}
          </h1>
          <NewAreaButton workspaceId={workspace.id} />
        </div>

        <div className="px-8 py-6">
          <AreasView areas={workspace.areas as AreaListItem[]} workspaceSlug={workspaceSlug} />
        </div>

        {groupedNotes.length > 0 && (
          <div className="px-8 pb-10">
            <NoteGroupList title={t.common.groupedNotes} groups={groupedNotes} />
          </div>
        )}

        {/* ── Unattached area notes ─────────────────────────────── */}
        {unattachedNotes.length > 0 && (
          <div className="px-8 pb-16">
            <div className="mb-4 flex items-center gap-3 border-t border-surface-container-high pt-10">
              <span className="font-label text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">
                {t.areas.unattachedNotes}
              </span>
              <span className="rounded bg-surface-container-high px-2 py-0.5 font-label text-[10px] font-bold text-on-surface-variant">
                {unattachedNotes.length}
              </span>
            </div>
            <AttachAreaNotePanel
              notes={unattachedNotes}
              areas={workspace.areas.map((a) => ({ id: a.id, title: a.title, icon: a.icon }))}
            />
          </div>
        )}
      </main>
    </div>
  );
}
