import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { db } from "@/server/db";
import type { Resource } from "@/generated/prisma/client";
import { Sidebar } from "@/components/layout/Sidebar";
import { AttachResourceNotePanel } from "@/components/resources/AttachResourceNotePanel";
import { ResourceAreaPicker } from "@/components/resources/ResourceAreaPicker";
import { NewResourceButton } from "@/components/resources/NewResourceButton";
import { IconPicker } from "@/components/ui/IconPicker";
import { getLocaleFromCookies, getDict } from "@/lib/get-locale";
import Link from "next/link";
import { Books, TreeStructure } from "@/components/ui/icons";
import { PickedIcon } from "@/components/ui/PickedIcon";

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
        {resources.length === 0 ? (
          <div className="mx-auto max-w-5xl px-10 py-24 text-center">
            <Books size={48} className="text-on-surface-variant" />
            <p className="mt-4 font-headline text-lg font-semibold text-on-surface">
              {t.resources.emptyTitle}
            </p>
            <p className="mt-1 font-body text-sm text-on-surface-variant">
              {t.resources.emptyDescription}
            </p>
          </div>
        ) : (
          <div className="mx-auto max-w-5xl px-10 pb-16">
            <div className="grid grid-cols-2 gap-x-12">
              {resources.map((resource, i) => (
                <div
                  key={resource.id}
                  className="group grid items-center gap-x-4 border-b border-surface-container-high transition-colors hover:bg-surface-container-low"
                  style={{ gridTemplateColumns: "44px 44px 1fr auto", margin: "0 -16px", padding: "16px 16px" }}
                >
                  {/* Number */}
                  <span className="font-body text-sm font-light tabular-nums text-on-surface-variant transition-colors group-hover:text-tertiary self-center">
                    {String(i + 1).padStart(2, "0")}
                  </span>

                  {/* Icon picker */}
                  <div className="self-center">
                    <IconPicker
                      entityType="resource"
                      entityId={resource.id}
                      currentIcon={resource.icon}
                      entityTitle={resource.title}
                      accentClass="text-tertiary"
                      bgClass="bg-tertiary-container/20"
                    />
                  </div>

                  {/* Title + description + area */}
                  <Link href={`/${workspaceSlug}/resources/${resource.id}`} className="min-w-0 block">
                    <h2 className="font-headline text-base font-bold text-on-surface transition-colors group-hover:text-tertiary">
                      {resource.title}
                    </h2>
                    {resource.description && (
                      <p className="mt-0.5 font-body text-xs font-light text-on-surface-variant">
                        {resource.description}
                      </p>
                    )}
                    {resource.area && (
                      <span className="mt-1 inline-flex items-center gap-1 font-label text-[10px] text-secondary">
                        {resource.area.icon
                          ? <PickedIcon name={resource.area.icon} size={10} />
                          : <TreeStructure size={10} />}
                        {resource.area.title}
                      </span>
                    )}
                  </Link>

                  {/* Note count + arrow */}
                  <Link href={`/${workspaceSlug}/resources/${resource.id}`} className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="font-headline text-xl font-light leading-none text-on-surface-variant">
                        {resource._count.notes}
                      </p>
                      <p className="font-label text-[9px] uppercase tracking-widest text-on-surface-variant">
                        {resource._count.notes === 1 ? t.resources.note_one : t.resources.note_other}
                      </p>
                    </div>
                    <span className="font-body text-sm text-on-surface-variant opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100 group-hover:text-tertiary">
                      →
                    </span>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

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
