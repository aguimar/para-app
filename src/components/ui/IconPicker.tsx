"use client";

import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useRouter } from "next/navigation";
import { PencilSimple } from "@phosphor-icons/react";
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

function titleInitial(title: string) {
  return title.trim()[0]?.toUpperCase() ?? "?";
}

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
  const ref = useRef<HTMLDivElement>(null);

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

  function pick(name: string) {
    setIcon(name);
    setOpen(false);
    onIconChange?.(name);
    if (entityType === "project")  updateProject.mutate({ id: entityId, icon: name });
    if (entityType === "area")     updateArea.mutate({ id: entityId, icon: name });
    if (entityType === "resource") updateResource.mutate({ id: entityId, icon: name });
    if (entityType === "note")     updateNote.mutate({ id: entityId, icon: name });
  }

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
        <div className="absolute left-0 top-full z-50 mt-2 w-80 rounded-2xl border border-surface-container-high bg-surface-container-lowest p-3 shadow-[0_16px_48px_rgba(42,52,57,0.16)]">
          {icon && (
            <button
              onClick={() => pick("")}
              className="mb-2 w-full rounded-lg px-3 py-1.5 text-left font-label text-[10px] uppercase tracking-widest text-on-surface-variant transition-colors hover:bg-surface-container"
            >
              Remover ícone
            </button>
          )}
          <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
            {ICON_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="mb-1.5 px-1 font-label text-[9px] font-bold uppercase tracking-[0.15em] text-on-surface-variant opacity-60">
                  {group.label}
                </p>
                <div className="grid grid-cols-8 gap-0.5">
                  {group.icons.map((name) => {
                    const IconComp = ICON_REGISTRY[name];
                    if (!IconComp) return null;
                    return (
                      <button
                        key={name}
                        onClick={() => pick(name)}
                        title={name}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all hover:scale-110 hover:bg-surface-container ${icon === name ? "bg-primary-container text-primary" : "text-on-surface-variant"}`}
                      >
                        <IconComp size={18} />
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
