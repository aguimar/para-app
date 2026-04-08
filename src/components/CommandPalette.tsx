"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { MagnifyingGlass, X, Notebook, Rocket, TreeStructure, Books } from "@/components/ui/icons";
import { useTranslation } from "@/lib/i18n-client";

const TYPE_ICONS = {
  note: Notebook,
  project: Rocket,
  area: TreeStructure,
  resource: Books,
} as const;

const TYPE_COLORS = {
  note: "text-primary",
  project: "text-primary",
  area: "text-secondary",
  resource: "text-tertiary",
} as const;

type SearchType = "note" | "project" | "area" | "resource";

interface CommandPaletteProps {
  workspaceId: string;
  workspaceSlug: string;
}

export function CommandPalette({ workspaceId, workspaceSlug }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<SearchType | undefined>(undefined);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const t = useTranslation();

  // Debounce query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Cmd+K listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setQuery("");
      setDebouncedQuery("");
      setTypeFilter(undefined);
      setActiveIndex(0);
    }
  }, [open]);

  // Search query
  const { data: results, isLoading } = trpc.search.search.useQuery(
    { workspaceId, query: debouncedQuery, type: typeFilter, limit: 20 },
    { enabled: open && debouncedQuery.length > 0 }
  );

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0);
  }, [results]);

  const navigate = useCallback(
    (result: { id: string; type: SearchType }) => {
      setOpen(false);
      const paths: Record<SearchType, string> = {
        note: `/note/${result.id}`,
        project: `/${workspaceSlug}/projects/${result.id}`,
        area: `/${workspaceSlug}/areas/${result.id}`,
        resource: `/${workspaceSlug}/resources/${result.id}`,
      };
      router.push(paths[result.type]);
    },
    [router, workspaceSlug]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!results || results.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % results.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + results.length) % results.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const result = results[activeIndex];
        if (result) navigate(result);
      }
    },
    [results, activeIndex, navigate]
  );

  if (!open) return null;

  const typeFilters: { key: SearchType | undefined; label: string }[] = [
    { key: undefined, label: t.search.typeAll },
    { key: "note", label: t.search.typeNotes },
    { key: "project", label: t.search.typeProjects },
    { key: "area", label: t.search.typeAreas },
    { key: "resource", label: t.search.typeResources },
  ];

  // Group results by type
  const grouped = (results ?? []).reduce(
    (acc, r) => {
      if (!acc[r.type]) acc[r.type] = [];
      acc[r.type]!.push(r);
      return acc;
    },
    {} as Record<SearchType, typeof results>
  );

  // Flat list for index tracking
  const flatResults = results ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-scrim/40 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-xl rounded-2xl bg-surface-container-low shadow-[0_24px_80px_rgba(0,0,0,0.3)] border border-outline-variant/10"
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-outline-variant/10 px-4 py-3">
          <MagnifyingGlass size={20} className="shrink-0 text-on-surface-variant" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.search.placeholder}
            className="flex-1 bg-transparent font-body text-base text-on-surface placeholder:text-on-surface-variant/50 outline-none"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-on-surface-variant hover:text-on-surface">
              <X size={16} />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center rounded bg-surface-container px-1.5 py-0.5 font-label text-[10px] text-on-surface-variant">
            ESC
          </kbd>
        </div>

        {/* Type filter chips */}
        <div className="flex gap-1.5 px-4 py-2 border-b border-outline-variant/10">
          {typeFilters.map(({ key, label }) => (
            <button
              key={label}
              onClick={() => setTypeFilter(key)}
              className={cn(
                "rounded-lg px-2.5 py-1 font-label text-[11px] font-medium transition-colors",
                typeFilter === key
                  ? "bg-primary-container text-on-primary-container"
                  : "text-on-surface-variant hover:bg-surface-container"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2">
          {isLoading && debouncedQuery && (
            <p className="px-3 py-8 text-center font-body text-sm text-on-surface-variant">
              {t.common.loading}
            </p>
          )}

          {!isLoading && debouncedQuery && flatResults.length === 0 && (
            <p className="px-3 py-8 text-center font-body text-sm text-on-surface-variant">
              {t.search.noResults} &ldquo;{debouncedQuery}&rdquo;
            </p>
          )}

          {!debouncedQuery && (
            <p className="px-3 py-8 text-center font-body text-sm text-on-surface-variant/50">
              {t.search.hint}
            </p>
          )}

          {flatResults.length > 0 &&
            (["note", "project", "area", "resource"] as SearchType[])
              .filter((type) => grouped[type]?.length)
              .map((type) => {
                const Icon = TYPE_ICONS[type];
                const sectionLabel =
                  type === "note" ? t.search.typeNotes :
                  type === "project" ? t.search.typeProjects :
                  type === "area" ? t.search.typeAreas :
                  t.search.typeResources;

                return (
                  <div key={type} className="mb-1">
                    <p className="px-3 py-1.5 font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                      {sectionLabel}
                    </p>
                    {grouped[type]!.map((result) => {
                      const globalIndex = flatResults.indexOf(result);
                      return (
                        <button
                          key={`${result.type}-${result.id}`}
                          onClick={() => navigate(result)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                            globalIndex === activeIndex
                              ? "bg-surface-container-lowest text-on-surface shadow-ambient"
                              : "text-on-surface-variant hover:bg-surface-container"
                          )}
                        >
                          <Icon size={18} className={cn("shrink-0", TYPE_COLORS[result.type])} />
                          <div className="min-w-0 flex-1">
                            <p
                              className="font-headline text-sm font-semibold text-on-surface truncate"
                              dangerouslySetInnerHTML={{ __html: result.headline }}
                            />
                          </div>
                          {result.category && (
                            <span className="shrink-0 rounded bg-surface-container px-1.5 py-0.5 font-label text-[9px] uppercase tracking-wide text-on-surface-variant">
                              {result.category}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
        </div>
      </div>
    </div>
  );
}
