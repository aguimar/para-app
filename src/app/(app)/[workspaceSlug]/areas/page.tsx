import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { db } from "@/server/db";
import type { Area } from "@/generated/prisma/client";
import { Sidebar } from "@/components/layout/Sidebar";
import Link from "next/link";

export default async function AreasPage({
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
      areas: {
        orderBy: { updatedAt: "desc" },
        include: { _count: { select: { notes: true } } },
      },
    },
  });

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
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Area
          </button>
        </div>

        <div className="px-8 py-6">
          {workspace.areas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <span className="material-symbols-outlined text-[48px] text-on-surface-variant">
                hub
              </span>
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
                <Link
                  key={area.id}
                  href={`/${workspaceSlug}/areas/${area.id}`}
                  className="group block rounded-xl bg-surface-container-lowest p-5 shadow-ambient transition-shadow hover:shadow-[0_16px_48px_rgba(42,52,57,0.10)]"
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-secondary">
                      hub
                    </span>
                    <span className="font-label text-[11px] uppercase tracking-widest text-secondary">
                      Area
                    </span>
                  </div>
                  <h3 className="mt-2 font-headline text-base font-semibold text-on-surface group-hover:text-secondary transition-colors">
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
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
