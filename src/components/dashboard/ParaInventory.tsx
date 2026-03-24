"use client";

import { Rocket, TreeStructure, Books, Archive } from "@phosphor-icons/react";
import { useTranslation } from "@/lib/i18n-client";

interface Props {
  projects: number;
  areas: number;
  resources: number;
  archives: number;
}

const ITEMS = [
  { key: "projects" as const, dictKey: "projects" as const, Icon: Rocket,        color: "text-primary" },
  { key: "areas"    as const, dictKey: "areas"    as const, Icon: TreeStructure, color: "text-secondary" },
  { key: "resources"as const, dictKey: "resources"as const, Icon: Books,         color: "text-tertiary" },
  { key: "archives" as const, dictKey: "archives" as const, Icon: Archive,       color: "text-outline" },
];

export function ParaInventory({ projects, areas, resources, archives }: Props) {
  const t = useTranslation();
  const counts = { projects, areas, resources, archives };
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {ITEMS.map(({ key, dictKey, Icon, color }) => (
        <div key={key} className="rounded-xl bg-surface-container-lowest p-4 shadow-ambient">
          <Icon size={22} className={color} />
          <p className="mt-2 font-headline text-2xl font-bold text-on-surface">{counts[key]}</p>
          <p className="font-label text-[11px] uppercase tracking-widest text-on-surface-variant">{t.dashboard[dictKey]}</p>
        </div>
      ))}
    </div>
  );
}
