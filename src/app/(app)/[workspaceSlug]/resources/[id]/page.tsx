import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { db } from "@/server/db";
import type { Note } from "@/generated/prisma/client";
import { Sidebar } from "@/components/layout/Sidebar";
import { NoteCard } from "@/components/ui/NoteCard";
import { IconPicker } from "@/components/ui/IconPicker";
import { type ParaCategory } from "@/types";
import { formatDate } from "@/lib/utils";
import { ArrowLeft, Link as LinkIcon, ArrowSquareOut, Books } from "@/components/ui/icons";
import { ResourceAreaPicker } from "@/components/resources/ResourceAreaPicker";
import { getLocaleFromCookies } from "@/lib/get-locale";

export default async function ResourceDetailPage({
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

  const [resource, workspaceAreas] = await Promise.all([
    db.resource.findUnique({
      where: { id, workspaceId: workspace.id },
      include: {
        notes: { orderBy: { updatedAt: "desc" } },
        area: { select: { id: true, title: true, icon: true } },
      },
    }),
    db.area.findMany({
      where: { workspaceId: workspace.id },
      select: { id: true, title: true, icon: true },
      orderBy: { title: "asc" },
    }),
  ]);
  if (!resource) notFound();

  const locale = await getLocaleFromCookies();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar workspaceSlug={workspaceSlug} workspaceName={workspace.name} locale={locale} />

      <main className="flex-1 overflow-y-auto bg-surface">
        {/* ── Sticky top bar ───────────────────────────────────────── */}
        <div className="sticky top-0 z-10 flex h-14 items-center gap-4 bg-surface/80 px-8 backdrop-blur-md border-b border-surface-container-high/50">
          <a
            href={`/${workspaceSlug}/resources`}
            className="text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <ArrowLeft size={20} />
          </a>
          <span className="font-label text-[10px] font-bold uppercase tracking-[0.18em] text-tertiary">
            Resources
          </span>
          <span className="text-on-surface-variant opacity-30">·</span>
          <h1 className="font-headline text-sm font-bold tracking-tight text-on-surface truncate">
            {resource.title}
          </h1>
        </div>

        <div className="mx-auto max-w-5xl px-8 py-10 space-y-10">
          {/* ── Resource header card ─────────────────────────────────── */}
          <div className="rounded-2xl bg-surface-container-lowest shadow-ambient overflow-hidden">
            {/* Amber accent strip */}
            <div className="h-1 w-full bg-tertiary opacity-60" />

            <div className="p-8">
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1 min-w-0">
                  {/* Icon + Title */}
                  <div className="flex items-center gap-4 mb-1">
                    <IconPicker
                      entityType="resource"
                      entityId={resource.id}
                      currentIcon={resource.icon}
                      entityTitle={resource.title}
                      accentClass="text-tertiary"
                      bgClass="bg-tertiary-container/20"
                    />
                    <h2 className="font-headline text-3xl font-bold leading-tight tracking-tight text-on-surface">
                      {resource.title}
                    </h2>
                  </div>

                  {/* Description */}
                  {resource.description && (
                    <p className="mt-3 font-body text-base text-on-surface-variant leading-relaxed max-w-2xl">
                      {resource.description}
                    </p>
                  )}

                  {/* URL */}
                  {resource.url && (
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-2 rounded-full border border-outline-variant px-4 py-1.5 font-body text-sm text-on-surface-variant hover:border-tertiary hover:text-tertiary transition-colors group"
                    >
                      <LinkIcon size={15} />
                      <span className="truncate max-w-xs">
                        {resource.url.replace(/^https?:\/\//, "")}
                      </span>
                      <ArrowSquareOut size={13} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  )}

                  {/* Tags */}
                  {resource.tags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {resource.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-tertiary-container/30 px-3 py-1 font-label text-[11px] font-semibold text-on-tertiary-container"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Note count badge */}
                <div className="shrink-0 flex flex-col items-center justify-center rounded-xl bg-surface-container px-5 py-4 min-w-[72px]">
                  <span className="font-headline text-3xl font-light leading-none text-on-surface">
                    {resource.notes.length}
                  </span>
                  <span className="mt-1 font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
                    {resource.notes.length === 1 ? "nota" : "notas"}
                  </span>
                </div>
              </div>

              {/* Meta row */}
              <div className="mt-8 flex items-center gap-6 border-t border-surface-container-high pt-5">
                <div>
                  <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
                    Área
                  </p>
                  <div className="mt-0.5">
                    <ResourceAreaPicker
                      resourceId={resource.id}
                      currentAreaId={resource.area?.id ?? null}
                      areas={workspaceAreas}
                    />
                  </div>
                </div>
                <div>
                  <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
                    Criado em
                  </p>
                  <p className="mt-0.5 font-body text-sm text-on-surface">
                    {formatDate(resource.createdAt)}
                  </p>
                </div>
                <div>
                  <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
                    Atualizado
                  </p>
                  <p className="mt-0.5 font-body text-sm text-on-surface">
                    {formatDate(resource.updatedAt)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Notes ───────────────────────────────────────────────── */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <h2 className="font-label text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                Notas
              </h2>
              {resource.notes.length > 0 && (
                <span className="rounded bg-surface-container-high px-2 py-0.5 font-label text-[10px] font-semibold text-on-surface-variant">
                  {resource.notes.length}
                </span>
              )}
            </div>

            {resource.notes.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-surface-container-highest py-16 text-center">
                <Books size={40} className="text-on-surface-variant opacity-40" />
                <p className="mt-4 font-headline text-base font-semibold text-on-surface-variant">
                  Nenhuma nota neste resource
                </p>
                <p className="mt-1 font-body text-sm text-on-surface-variant opacity-60">
                  Atribua notas da categoria Resource a este tópico.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {resource.notes.map((note: Note) => (
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
