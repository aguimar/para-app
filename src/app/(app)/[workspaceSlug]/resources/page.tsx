import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { db } from "@/server/db";
import type { Resource } from "@/generated/prisma/client";
import { Sidebar } from "@/components/layout/Sidebar";
import Link from "next/link";

export default async function ResourcesPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { workspaceSlug } = await params;
  const workspace = await db.workspace.findUnique({
    where: { slug: workspaceSlug },
    include: {
      resources: {
        orderBy: { updatedAt: "desc" },
        include: { _count: { select: { notes: true } } },
      },
    },
  });

  if (!workspace || workspace.userId !== userId) notFound();

  // Collect all unique tags
  const allTags = Array.from(
    new Set(workspace.resources.flatMap((r: Resource) => r.tags))
  ).sort() as string[];

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar workspaceSlug={workspaceSlug} workspaceName={workspace.name} />

      <main className="flex-1 overflow-y-auto bg-surface">
        <div className="sticky top-0 z-10 flex h-14 items-center justify-between bg-surface/80 px-8 backdrop-blur-md">
          <h1 className="font-headline text-2xl font-bold tracking-tight text-on-surface">
            Resources
          </h1>
          <button className="flex items-center gap-2 rounded-full bg-tertiary px-4 py-2 text-sm font-semibold text-on-tertiary shadow-ambient transition hover:bg-tertiary-dim">
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Resource
          </button>
        </div>

        <div className="px-8 py-6 space-y-6">
          {/* Tag filter */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {allTags.map((tag) => (
                <span
                  key={tag}
                  className="cursor-pointer rounded bg-tertiary-container px-2.5 py-1 font-label text-[11px] font-semibold text-on-tertiary-container transition hover:opacity-80"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {workspace.resources.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <span className="material-symbols-outlined text-[48px] text-on-surface-variant">
                book_2
              </span>
              <p className="mt-4 font-headline text-lg font-semibold text-on-surface">
                No resources yet
              </p>
              <p className="mt-1 font-body text-sm text-on-surface-variant">
                Resources are topics of ongoing interest or research.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {workspace.resources.map((resource: Resource & { _count: { notes: number } }) => (
                <Link
                  key={resource.id}
                  href={`/${workspaceSlug}/resources/${resource.id}`}
                  className="group block rounded-xl bg-surface-container-lowest p-5 shadow-ambient transition-shadow hover:shadow-[0_16px_48px_rgba(42,52,57,0.10)]"
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-tertiary">
                      book_2
                    </span>
                  </div>
                  <h3 className="mt-2 font-headline text-base font-semibold text-on-surface group-hover:text-tertiary transition-colors">
                    {resource.title}
                  </h3>
                  {resource.description && (
                    <p className="mt-1.5 font-body text-sm text-on-surface-variant line-clamp-2">
                      {resource.description}
                    </p>
                  )}
                  {resource.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {resource.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded bg-tertiary-container px-1.5 py-0.5 font-label text-[10px] text-on-tertiary-container"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="mt-4 font-label text-[11px] uppercase tracking-widest text-on-surface-variant">
                    {resource._count.notes} {resource._count.notes === 1 ? "note" : "notes"}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
