"use client";

import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useRouter } from "next/navigation";

const EMOJI_GROUPS = [
  { label: "Conhecimento",   emojis: ["📚","📖","📝","🗒️","📋","📌","🔖","📑","📄","🗂️","🗃️","📜"] },
  { label: "Ciência & Mente",emojis: ["🧠","💡","🔬","🔭","⚗️","🧬","🧪","🧲","🌡️","💊","🩺","🏥"] },
  { label: "Tecnologia",     emojis: ["💻","🖥️","📱","⌨️","🖱️","💾","💿","📡","🔌","🔋","🛠️","⚙️"] },
  { label: "Arte & Cultura", emojis: ["🎨","🎭","🎬","🎵","🎸","🎹","🎤","🖼️","✏️","🖊️","🎙️","📷"] },
  { label: "Natureza & Vida",emojis: ["🌱","🌿","🌳","🌍","🌊","🔥","💧","⚡","🌸","🦋","🐾","🌺"] },
  { label: "Negócios",       emojis: ["💼","📊","📈","💰","🏦","🤝","🎯","🏆","🚀","💎","🔑","📣"] },
  { label: "Pessoas",        emojis: ["👤","👥","🧑‍🎓","🧑‍💼","🧑‍🔬","🧑‍🏫","❤️","🌐","🏠","🗣️","💬","🎓"] },
  { label: "Saúde",          emojis: ["🏃","🧘","💪","🥗","😴","🧖","🏋️","🚴","🌅","☕","🫁","🦷"] },
];

type EntityType = "project" | "area" | "resource" | "note";

interface Props {
  entityType: EntityType;
  entityId: string;
  currentIcon: string;
  entityTitle: string;
  accentClass?: string; // e.g. "text-primary" / "text-secondary" / "text-tertiary"
  bgClass?: string;     // e.g. "bg-primary-container/20"
  onIconChange?: (emoji: string) => void; // optional callback for optimistic UI
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

  function pick(emoji: string) {
    setIcon(emoji);
    setOpen(false);
    onIconChange?.(emoji);
    if (entityType === "project")  updateProject.mutate({ id: entityId, icon: emoji });
    if (entityType === "area")     updateArea.mutate({ id: entityId, icon: emoji });
    if (entityType === "resource") updateResource.mutate({ id: entityId, icon: emoji });
    if (entityType === "note")     updateNote.mutate({ id: entityId, icon: emoji });
  }

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        title="Trocar ícone"
        className={`group relative flex h-11 w-11 items-center justify-center rounded-xl ${bgClass} text-[22px] transition-all hover:scale-105 hover:brightness-110`}
      >
        {icon ? (
          <span>{icon}</span>
        ) : (
          <span className={`font-headline text-base font-bold leading-none ${accentClass}`}>
            {titleInitial(entityTitle)}
          </span>
        )}
        <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-outline-variant bg-surface-container opacity-0 transition-opacity group-hover:opacity-100">
          <span className="material-symbols-outlined text-[10px] text-on-surface-variant">edit</span>
        </span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-2xl border border-surface-container-high bg-surface-container-lowest p-3 shadow-[0_16px_48px_rgba(42,52,57,0.16)]">
          {icon && (
            <button
              onClick={() => pick("")}
              className="mb-2 w-full rounded-lg px-3 py-1.5 text-left font-label text-[10px] uppercase tracking-widest text-on-surface-variant transition-colors hover:bg-surface-container"
            >
              Remover ícone
            </button>
          )}
          <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
            {EMOJI_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="mb-1.5 px-1 font-label text-[9px] font-bold uppercase tracking-[0.15em] text-on-surface-variant opacity-60">
                  {group.label}
                </p>
                <div className="grid grid-cols-8 gap-0.5">
                  {group.emojis.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => pick(emoji)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-lg transition-all hover:scale-110 hover:bg-surface-container"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
