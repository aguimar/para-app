"use client";

import { useState } from "react";
import { MagnifyingGlass } from "@/components/ui/icons";
import { useTranslation } from "@/lib/i18n-client";

export function ListFilter<T extends { title: string }>({
  items,
  onFilter,
}: {
  items: T[];
  onFilter: (filtered: T[]) => void;
}) {
  const [query, setQuery] = useState("");
  const t = useTranslation();

  function handleChange(value: string) {
    setQuery(value);
    if (!value.trim()) {
      onFilter(items);
    } else {
      const lower = value.toLowerCase();
      onFilter(items.filter((item) => item.title.toLowerCase().includes(lower)));
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-xl bg-surface-container-low px-3 py-2">
      <MagnifyingGlass size={16} className="shrink-0 text-on-surface-variant" />
      <input
        type="text"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={t.listFilter.placeholder}
        className="bg-transparent font-body text-sm text-on-surface placeholder:text-on-surface-variant/50 outline-none w-36"
      />
    </div>
  );
}
