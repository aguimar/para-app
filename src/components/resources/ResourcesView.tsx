"use client";

import { useState } from "react";
import Link from "next/link";
import { Books, TreeStructure } from "@/components/ui/icons";
import { IconPicker } from "@/components/ui/IconPicker";
import { PickedIcon } from "@/components/ui/PickedIcon";
import { ListFilter } from "@/components/ListFilter";
import { useTranslation } from "@/lib/i18n-client";

type AreaSnippet = { id: string; title: string; icon: string };

type ResourceItem = {
  id: string;
  title: string;
  icon: string;
  description: string | null;
  _count: { notes: number };
  area: AreaSnippet | null;
};

interface ResourcesViewProps {
  resources: ResourceItem[];
  workspaceSlug: string;
}

export function ResourcesView({ resources, workspaceSlug }: ResourcesViewProps) {
  const t = useTranslation();
  const [filtered, setFiltered] = useState<ResourceItem[]>(resources);

  if (resources.length === 0) {
    return (
      <div className="mx-auto max-w-5xl px-10 py-24 text-center">
        <Books size={48} className="text-on-surface-variant" />
        <p className="mt-4 font-headline text-lg font-semibold text-on-surface">
          {t.resources.emptyTitle}
        </p>
        <p className="mt-1 font-body text-sm text-on-surface-variant">
          {t.resources.emptyDescription}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-10 pb-16">
      <div className="mb-4">
        <ListFilter items={resources} onFilter={(f) => setFiltered(f as ResourceItem[])} />
      </div>

      {filtered.length === 0 ? (
        <p className="py-12 text-center font-body text-sm text-on-surface-variant">
          {t.listFilter.noMatches}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-x-12">
          {filtered.map((resource, i) => (
            <div
              key={resource.id}
              className="group grid items-center gap-x-4 border-b border-surface-container-high transition-colors hover:bg-surface-container-low"
              style={{ gridTemplateColumns: "44px 44px 1fr auto", margin: "0 -16px", padding: "16px 16px" }}
            >
              <span className="font-body text-sm font-light tabular-nums text-on-surface-variant transition-colors group-hover:text-tertiary self-center">
                {String(i + 1).padStart(2, "0")}
              </span>

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
      )}
    </div>
  );
}
