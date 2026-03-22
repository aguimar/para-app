"use client";

import { Rocket, TreeStructure, Books, Archive } from "@phosphor-icons/react";

interface Props {
  projects: number;
  areas: number;
  resources: number;
  archives: number;
}

const ITEMS = [
  { key: "projects" as const, label: "Projects", Icon: Rocket,        color: "text-primary" },
  { key: "areas"    as const, label: "Areas",    Icon: TreeStructure, color: "text-secondary" },
  { key: "resources"as const, label: "Resources",Icon: Books,         color: "text-tertiary" },
  { key: "archives" as const, label: "Archives", Icon: Archive,       color: "text-outline" },
];

export function ParaInventory({ projects, areas, resources, archives }: Props) {
  const counts = { projects, areas, resources, archives };
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {ITEMS.map(({ key, label, Icon, color }) => (
        <div key={key} className="rounded-xl bg-surface-container-lowest p-4 shadow-ambient">
          <Icon size={22} className={color} />
          <p className="mt-2 font-headline text-2xl font-bold text-on-surface">{counts[key]}</p>
          <p className="font-label text-[11px] uppercase tracking-widest text-on-surface-variant">{label}</p>
        </div>
      ))}
    </div>
  );
}
