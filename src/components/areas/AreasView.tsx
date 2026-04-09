"use client";

import { useState } from "react";
import Link from "next/link";
import { TreeStructure } from "@/components/ui/icons";
import { IconPicker } from "@/components/ui/IconPicker";
import { ListFilter } from "@/components/ListFilter";
import { useTranslation } from "@/lib/i18n-client";
import { plural } from "@/lib/utils";

type AreaItem = {
  id: string;
  title: string;
  icon: string;
  description: string | null;
  _count: { notes: number; projects: number; resources: number };
};

interface AreasViewProps {
  areas: AreaItem[];
  workspaceSlug: string;
}

export function AreasView({ areas, workspaceSlug }: AreasViewProps) {
  const t = useTranslation();
  const [filtered, setFiltered] = useState<AreaItem[]>(areas);

  if (areas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <TreeStructure size={48} className="text-on-surface-variant" />
        <p className="mt-4 font-headline text-lg font-semibold text-on-surface">
          {t.areas.emptyTitle}
        </p>
        <p className="mt-1 font-body text-sm text-on-surface-variant">
          {t.areas.emptyDescription}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4">
        <ListFilter items={areas} onFilter={(f) => setFiltered(f as AreaItem[])} />
      </div>

      {filtered.length === 0 ? (
        <p className="py-12 text-center font-body text-sm text-on-surface-variant">
          {t.listFilter.noMatches}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((area) => (
            <div
              key={area.id}
              className="group relative rounded-xl bg-surface-container-lowest p-5 shadow-ambient transition-shadow hover:shadow-[0_16px_48px_rgba(42,52,57,0.10)]"
            >
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
                <div className="mt-4 flex items-center gap-3 flex-wrap">
                  <p className="font-label text-[11px] uppercase tracking-widest text-on-surface-variant">
                    {plural(area._count.projects, t.areas.project_one, t.areas.project_other)}
                  </p>
                  <span className="text-outline-variant">·</span>
                  <p className="font-label text-[11px] uppercase tracking-widest text-on-surface-variant">
                    {plural(area._count.resources, t.areas.resource_one, t.areas.resource_other)}
                  </p>
                  <span className="text-outline-variant">·</span>
                  <p className="font-label text-[11px] uppercase tracking-widest text-on-surface-variant">
                    {plural(area._count.notes, t.areas.note_one, t.areas.note_other)}
                  </p>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
