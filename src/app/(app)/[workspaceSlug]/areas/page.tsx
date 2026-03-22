import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { db } from "@/server/db";
import type { Area } from "@/generated/prisma/client";
import { Sidebar } from "@/components/layout/Sidebar";
import { AttachAreaNotePanel } from "@/components/areas/AttachAreaNotePanel";
import { IconPicker } from "@/components/ui/IconPicker";
import Link from "next/link";
import { Plus, TreeStructure } from "@phosphor-icons/react";

export default async function AreasPage({
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
        areas: {
          orderBy: { updatedAt: "desc" },
          include: { _count: { select: { notes: true } } },
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
  ]);

  if (!workspace || workspace.userId !== userId) notFound();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar workspaceSlug={workspaceSlug} workspaceName={workspace.name} />

      <main className="flex-1 overflow-y-auto bg-surface">
        <div className="sticky top-0 z-10 flex h-14 items-center justify-between bg-surface/80 px-8 backdrop-blur-md">
          <h1 className="font-headline text-2xl font-bold tracking-tight text-on-surface">
            Areas
          </h1>
          <button className="flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-semibold text-on-secondary shadow-ambient transition hover:bg-secondary-dim">
            <Plus size={18} />
            New Area
          </button>
        </div>

        <div className="px-8 py-6">
          {workspace.areas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <TreeStructure size={48} className="text-on-surface-variant" />
              <p className="mt-4 font-headline text-lg font-semibold text-on-surface">
                No areas yet
              </p>
              <p className="mt-1 font-body text-sm text-on-surface-variant">
                Areas are ongoing responsibilities that require a standard of performance over time.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {workspace.areas.map((area: Area & { _count: { notes: number } }) => (
                <div
                  key={area.id}
                  className="group relative rounded-xl bg-surface-container-lowest p-5 shadow-ambient transition-shadow hover:shadow-[0_16px_48px_rgba(42,52,57,0.10)]"
                >
                  {/* Icon picker outside Link */}
                  <div className="mb-3">
                    <IconPicker
                      entityType="area"
                      entityId={area.id}
                      currentIcon={area.icon}
                      entityTitle={area.title}
                      accentClass="text-secondary"
                      bgClass="bg-secondary-container/20"
                    />
                  </div>

                  <Link href={`/${workspaceSlug}/areas/${area.id}`} className="block">
                    <h3 className="font-headline text-base font-semibold text-on-surface group-hover:text-secondary transition-colors">
                      {area.title}
                    </h3>
                    {area.description && (
                      <p className="mt-1.5 font-body text-sm text-on-surface-variant line-clamp-2">
                        {area.description}
                      </p>
                    )}
                    <p className="mt-4 font-label text-[11px] uppercase tracking-widest text-on-surface-variant">
                      {area._count.notes} {area._count.notes === 1 ? "note" : "notes"}
                    </p>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Unattached area notes ─────────────────────────────── */}
        {unattachedNotes.length > 0 && (
          <div className="px-8 pb-16">
            <div className="mb-4 flex items-center gap-3 border-t border-surface-container-high pt-10">
              <span className="font-label text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">
                Area Notes — not yet attached
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
