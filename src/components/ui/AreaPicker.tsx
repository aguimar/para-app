"use client";

import { useState } from "react";
import { PickedIcon } from "@/components/ui/PickedIcon";
import { TreeStructure, CaretUpDown } from "@phosphor-icons/react";

interface Area {
  id: string;
  title: string;
  icon: string;
}

interface Props {
  currentAreaId: string | null;
  areas: Area[];
  isPending?: boolean;
  onChange: (areaId: string | null) => void;
}

export function AreaPicker({ currentAreaId, areas, isPending, onChange }: Props) {
  const [areaId, setAreaId] = useState(currentAreaId ?? "");

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    setAreaId(val);
    onChange(val || null);
  }

  const current = areas.find((a) => a.id === areaId);

  return (
    <div className="relative inline-flex items-center gap-1.5">
      {current ? (
        current.icon
          ? <PickedIcon name={current.icon} size={14} className="text-secondary shrink-0" />
          : <TreeStructure size={14} className="text-secondary shrink-0" />
      ) : null}
      <select
        value={areaId}
        onChange={handleChange}
        disabled={isPending}
        className="appearance-none bg-transparent font-body text-sm font-medium text-secondary hover:underline cursor-pointer focus:outline-none disabled:opacity-50 pr-4"
      >
        <option value="">— No area —</option>
        {areas.map((a) => (
          <option key={a.id} value={a.id}>{a.title}</option>
        ))}
      </select>
      <CaretUpDown size={12} className="pointer-events-none text-secondary shrink-0 -ml-3" />
    </div>
  );
}
