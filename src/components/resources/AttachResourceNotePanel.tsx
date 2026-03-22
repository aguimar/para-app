"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useRouter } from "next/navigation";
import { cn, bodyToPlainText } from "@/lib/utils";
import Link from "next/link";
import { Link as LinkIcon, Books } from "@phosphor-icons/react";
import type { Note, Resource } from "@/generated/prisma/client";

interface Props {
  notes: Note[];
  resources: Pick<Resource, "id" | "title" | "icon">[];
}

export function AttachResourceNotePanel({ notes: initialNotes, resources }: Props) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [attaching, setAttaching] = useState<string | null>(null);

  const updateNote = trpc.note.update.useMutation({
    onSuccess: (updated) => {
      setNotes((prev) => prev.filter((n) => n.id !== updated.id));
      setAttaching(null);
      setOpenDropdown(null);
      router.refresh();
    },
  });

  if (notes.length === 0) return null;

  return (
    <div>
      <div className="flex flex-col gap-3">
        {notes.map((note) => (
          <div
            key={note.id}
            className="flex items-center justify-between rounded-xl bg-surface-container-lowest px-5 py-4 shadow-ambient"
          >
            <Link
              href={`/note/${note.id}`}
              className="group flex flex-col gap-1 flex-1 min-w-0"
            >
              <span className="font-headline text-base font-bold text-on-surface group-hover:text-tertiary transition-colors truncate">
                {note.title || "Untitled"}
              </span>
              {note.body && (
                <span className="font-body text-sm text-on-surface-variant line-clamp-1">
                  {bodyToPlainText(note.body).slice(0, 80)}
                </span>
              )}
            </Link>

            {resources.length > 0 && (
              <div className="relative ml-6 flex-shrink-0">
                <button
                  onClick={() =>
                    setOpenDropdown((prev) => (prev === note.id ? null : note.id))
                  }
                  disabled={attaching === note.id}
                  className={cn(
                    "flex items-center gap-2 rounded-full border border-tertiary px-4 py-2 font-label text-[11px] font-bold uppercase tracking-widest text-tertiary transition-all hover:bg-tertiary-container",
                    attaching === note.id && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <LinkIcon size={16} />
                  Attach
                </button>

                {openDropdown === note.id && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl bg-surface-container-lowest py-2 shadow-[0_12px_40px_rgba(42,52,57,0.12)]">
                    {resources.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => {
                          setAttaching(note.id);
                          updateNote.mutate({ id: note.id, resourceId: r.id, category: "RESOURCE" });
                        }}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left font-body text-sm text-on-surface transition-colors hover:bg-surface-container"
                      >
                        {r.icon ? (
                          <span className="text-base leading-none">{r.icon}</span>
                        ) : (
                          <Books size={16} className="text-tertiary" />
                        )}
                        {r.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {openDropdown && (
        <div className="fixed inset-0 z-40" onClick={() => setOpenDropdown(null)} />
      )}
    </div>
  );
}
