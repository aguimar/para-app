"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useRouter } from "next/navigation";
import { cn, bodyToPlainText } from "@/lib/utils";
import Link from "next/link";
import type { Note, Project } from "@/generated/prisma/client";

interface Props {
  notes: Note[];
  projects: Pick<Project, "id" | "title">[];
}

export function AttachNotePanel({ notes: initialNotes, projects }: Props) {
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

  const handleAttach = (noteId: string, projectId: string) => {
    setAttaching(noteId);
    updateNote.mutate({ id: noteId, projectId, category: "PROJECT" });
  };

  if (notes.length === 0) return null;

  return (
    <section className="mt-12">
      <div className="mb-6 flex items-center gap-3">
        <span className="material-symbols-outlined text-[20px] text-on-surface-variant">
          unarchive
        </span>
        <h2 className="font-label text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
          Unattached Notes — Project Category
        </h2>
        <span className="rounded bg-surface-container-high px-2 py-0.5 font-label text-[11px] font-bold text-on-surface-variant">
          {notes.length}
        </span>
      </div>

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
              <span className="font-headline text-base font-bold text-on-surface group-hover:text-primary transition-colors truncate">
                {note.title || "Untitled"}
              </span>
              {note.body && (
                <span className="font-body text-sm text-on-surface-variant line-clamp-1">
                  {bodyToPlainText(note.body).slice(0, 80)}
                </span>
              )}
            </Link>

            {/* Attach dropdown */}
            <div className="relative ml-6 flex-shrink-0">
              <button
                onClick={() =>
                  setOpenDropdown((prev) => (prev === note.id ? null : note.id))
                }
                disabled={attaching === note.id}
                className={cn(
                  "flex items-center gap-2 rounded-full bg-primary px-4 py-2 font-label text-[11px] font-bold uppercase tracking-widest text-on-primary transition-all hover:opacity-90",
                  attaching === note.id && "opacity-50 cursor-not-allowed"
                )}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {attaching === note.id ? "sync" : "link"}
                </span>
                Attach to Project
              </button>

              {openDropdown === note.id && (
                <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl bg-surface-container-lowest py-2 shadow-[0_12px_40px_rgba(42,52,57,0.12)]">
                  {projects.length === 0 ? (
                    <p className="px-4 py-2 font-body text-sm text-on-surface-variant">
                      No projects yet
                    </p>
                  ) : (
                    projects.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handleAttach(note.id, p.id)}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left font-body text-sm text-on-surface transition-colors hover:bg-surface-container"
                      >
                        <span className="material-symbols-outlined text-[16px] text-primary">
                          folder
                        </span>
                        {p.title}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Click outside to close dropdown */}
      {openDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpenDropdown(null)}
        />
      )}
    </section>
  );
}
