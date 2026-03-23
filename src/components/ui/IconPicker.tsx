"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useRouter } from "next/navigation";
import { PencilSimple, MagnifyingGlass, X } from "@phosphor-icons/react";
import { ICON_GROUPS, ICON_REGISTRY } from "@/lib/icon-registry";
import { PickedIcon } from "./PickedIcon";

type EntityType = "project" | "area" | "resource" | "note";

interface Props {
  entityType: EntityType;
  entityId: string;
  currentIcon: string;
  entityTitle: string;
  accentClass?: string;
  bgClass?: string;
  onIconChange?: (name: string) => void;
}

const RECENT_KEY = "icon-picker-recent";
const MAX_RECENT = 8;

function getRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function addRecent(name: string) {
  const prev = getRecent().filter((n) => n !== name);
  const next = [name, ...prev].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

function titleInitial(title: string) {
  return title.trim()[0]?.toUpperCase() ?? "?";
}

const ALL_TAB = "__all__";
const RECENT_TAB = "__recent__";

export function IconPicker({
  entityType,
  entityId,
  currentIcon,
  entityTitle,
  accentClass = "text-tertiary",
  bgClass = "bg-tertiary-container/20",
  onIconChange,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [icon, setIcon] = useState(currentIcon);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState(RECENT_TAB);
  const [recent, setRecent] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const updateProject  = trpc.project.update.useMutation({ onSuccess: () => router.refresh() });
  const updateArea     = trpc.area.update.useMutation({ onSuccess: () => router.refresh() });
  const updateResource = trpc.resource.update.useMutation({ onSuccess: () => router.refresh() });
  const updateNote     = trpc.note.update.useMutation({ onSuccess: () => router.refresh() });

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  useEffect(() => {
    if (open) {
      setRecent(getRecent());
      setSearch("");
      setActiveTab(getRecent().length > 0 ? RECENT_TAB : ICON_GROUPS[0]!.label);
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [open]);

  const displayedIcons = useMemo(() => {
    if (search.trim()) {
      const q = search.toLowerCase();
      return Object.keys(ICON_REGISTRY).filter((n) => n.toLowerCase().includes(q));
    }
    if (activeTab === RECENT_TAB) return recent;
    const group = ICON_GROUPS.find((g) => g.label === activeTab);
    return group?.icons ?? [];
  }, [search, activeTab, recent]);

  function pick(name: string) {
    setIcon(name);
    setOpen(false);
    addRecent(name);
    onIconChange?.(name);
    if (entityType === "project")  updateProject.mutate({ id: entityId, icon: name });
    if (entityType === "area")     updateArea.mutate({ id: entityId, icon: name });
    if (entityType === "resource") updateResource.mutate({ id: entityId, icon: name });
    if (entityType === "note")     updateNote.mutate({ id: entityId, icon: name });
  }

  const tabs = [
    { id: RECENT_TAB, label: "Recentes" },
    ...ICON_GROUPS.map((g) => ({ id: g.label, label: g.label })),
  ];

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        title="Trocar ícone"
        className={`group relative flex h-11 w-11 items-center justify-center rounded-xl ${bgClass} transition-all hover:scale-105 hover:brightness-110`}
      >
        {icon ? (
          <PickedIcon name={icon} size={22} className={accentClass} />
        ) : (
          <span className={`font-headline text-base font-bold leading-none ${accentClass}`}>
            {titleInitial(entityTitle)}
          </span>
        )}
        <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-outline-variant bg-surface-container opacity-0 transition-opacity group-hover:opacity-100">
          <PencilSimple size={10} className="text-on-surface-variant" />
        </span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-[340px] rounded-2xl border border-surface-container-high bg-surface-container-lowest shadow-[0_16px_48px_rgba(42,52,57,0.16)]">
          {/* Search */}
          <div className="flex items-center gap-2 border-b border-surface-container-high px-3 py-2.5">
            <MagnifyingGlass size={14} className="shrink-0 text-on-surface-variant" />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar ícone…"
              className="min-w-0 flex-1 bg-transparent font-body text-sm text-on-surface outline-none placeholder:text-on-surface-variant/50"
            />
            {search && (
              <button onClick={() => setSearch("")} className="shrink-0 text-on-surface-variant hover:text-on-surface">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Category tabs — only when not searching */}
          {!search && (
            <div className="flex gap-0.5 overflow-x-auto border-b border-surface-container-high px-2 py-1.5 scrollbar-none">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`shrink-0 rounded-lg px-2.5 py-1 font-label text-[10px] font-bold uppercase tracking-wider transition-all ${
                    activeTab === tab.id
                      ? "bg-primary-container text-primary"
                      : "text-on-surface-variant hover:bg-surface-container"
                  }`}
                >
                  {tab.id === RECENT_TAB ? "Recentes" : tab.label}
                </button>
              ))}
            </div>
          )}

          {/* Icon grid */}
          <div className="p-2">
            {displayedIcons.length === 0 ? (
              <p className="py-6 text-center font-body text-xs text-on-surface-variant">
                {activeTab === RECENT_TAB ? "Nenhum ícone recente" : "Nenhum resultado"}
              </p>
            ) : (
              <div className="grid grid-cols-8 gap-0.5 max-h-56 overflow-y-auto pr-0.5">
                {displayedIcons.map((name) => {
                  const IconComp = ICON_REGISTRY[name];
                  if (!IconComp) return null;
                  return (
                    <button
                      key={name}
                      onClick={() => pick(name)}
                      title={name}
                      className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all hover:scale-110 hover:bg-surface-container ${
                        icon === name ? "bg-primary-container text-primary" : "text-on-surface-variant"
                      }`}
                    >
                      <IconComp size={18} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Remove icon footer */}
          {icon && (
            <div className="border-t border-surface-container-high px-3 py-2">
              <button
                onClick={() => pick("")}
                className="w-full rounded-lg px-3 py-1.5 text-left font-label text-[10px] uppercase tracking-widest text-on-surface-variant transition-colors hover:bg-surface-container"
              >
                Remover ícone
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
