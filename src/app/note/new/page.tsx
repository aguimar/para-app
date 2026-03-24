"use client";

import { Suspense } from "react";
import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { NoteEditor } from "@/components/notes/NoteEditor";
import { ParaBadge } from "@/components/ui/ParaBadge";
import { cn } from "@/lib/utils";
import { type ParaCategory, PARA_CATEGORIES, PARA_LABELS } from "@/types";
import { PARA_ICONS } from "@/lib/para-icons";
import { ArrowLeft, CircleNotch, FloppyDisk, Info } from "@phosphor-icons/react";

function NewNotePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workspaceId = searchParams.get("workspaceId") ?? "";

  const createNote = trpc.note.create.useMutation();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<ParaCategory>("INBOX");
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [saving, setSaving] = useState(false);

  const isDirty = title.trim() !== "" || body !== "";

  const save = useCallback(async () => {
    if (!title.trim() && !body) return;
    setSaving(true);
    try {
      const note = await createNote.mutateAsync({
        workspaceId,
        title: title.trim() || "Untitled",
        body,
        category,
      });
      router.replace(`/note/${note.id}`);
    } finally {
      setSaving(false);
    }
  }, [workspaceId, title, body, category, createNote, router]);

  // Cmd/Ctrl+S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (isDirty) save();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isDirty, save]);

  return (
    <div className="flex h-screen overflow-hidden bg-surface-container-lowest">
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex h-14 shrink-0 items-center gap-3 px-6 bg-surface-container-lowest">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <ArrowLeft size={20} />
          </button>

          {/* placeholder to align with [id] editor — no IconPicker until note is saved */}
          <div className="h-11 w-11 rounded-xl bg-surface-container flex items-center justify-center">
            <span className="font-headline text-base font-bold leading-none text-on-surface-variant">
              {title.trim()[0]?.toUpperCase() ?? "?"}
            </span>
          </div>

          <input
            autoFocus
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled"
            className="flex-1 bg-transparent font-headline text-lg font-bold text-on-surface placeholder:text-on-surface-variant focus:outline-none"
          />

          <div className="flex items-center gap-2">
            {isDirty ? (
              <button
                onClick={save}
                disabled={saving}
                className={cn(
                  "flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 font-label text-[11px] font-bold uppercase tracking-widest text-on-primary transition-opacity",
                  saving && "opacity-60 cursor-not-allowed"
                )}
              >
                {saving ? (
                  <CircleNotch size={14} className="animate-spin" />
                ) : (
                  <FloppyDisk size={14} />
                )}
                {saving ? "Saving…" : "Save"}
              </button>
            ) : (
              <span className="font-label text-[11px] uppercase tracking-widest text-on-surface-variant">
                Not saved
              </span>
            )}

            <ParaBadge category={category} />

            <button
              onClick={() => setInspectorOpen((o) => !o)}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                inspectorOpen
                  ? "bg-primary-container text-on-primary-container"
                  : "text-on-surface-variant hover:bg-surface-container"
              )}
              title="Toggle inspector"
            >
              <Info size={18} />
            </button>
          </div>
        </div>

        {/* Writing canvas */}
        <div className="flex-1 overflow-y-auto px-12 py-8">
          <NoteEditor
            content=""
            onChange={(val) => setBody(val)}
            placeholder="Start writing your thoughts…"
          />
        </div>
      </div>

      {/* Inspector */}
      {inspectorOpen && (
        <aside className="w-72 shrink-0 overflow-y-auto bg-surface-container-low p-6 space-y-6">
          <div>
            <p className="font-label text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant mb-3">
              Category
            </p>
            <div className="space-y-1">
              {PARA_CATEGORIES.map((cat) => {
                const CatIcon = PARA_ICONS[cat];
                return (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      category === cat
                        ? "bg-surface-container-lowest text-on-surface shadow-ambient"
                        : "text-on-surface-variant hover:bg-surface-container"
                    )}
                  >
                    <CatIcon size={16} />
                    {PARA_LABELS[cat]}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}

export default function NewNotePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NewNotePageContent />
    </Suspense>
  );
}
