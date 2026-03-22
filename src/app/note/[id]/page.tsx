"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { NoteEditor } from "@/components/notes/NoteEditor";
import { ParaBadge } from "@/components/ui/ParaBadge";
import { cn } from "@/lib/utils";
import { type ParaCategory, PARA_CATEGORIES, PARA_LABELS, PARA_ICONS } from "@/types";

export default function NoteEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const { data: note, isLoading } = trpc.note.byId.useQuery({ id: params.id });
  const updateNote = trpc.note.update.useMutation();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<ParaCategory>("PROJECT");
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setBody(note.body);
      setCategory(note.category as ParaCategory);
    }
  }, [note]);

  const save = useCallback(
    async (patch: { title?: string; body?: string; category?: ParaCategory }) => {
      setSaving(true);
      try {
        await updateNote.mutateAsync({ id: params.id, ...patch });
      } finally {
        setSaving(false);
      }
    },
    [params.id, updateNote]
  );

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface">
        <span className="material-symbols-outlined animate-spin text-[32px] text-on-surface-variant">
          progress_activity
        </span>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface">
        <p className="font-body text-on-surface-variant">Note not found.</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface-container-lowest">
      {/* Editor area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex h-14 shrink-0 items-center gap-3 px-6 bg-surface-container-lowest">
          <button
            onClick={() => router.back()}
            className="material-symbols-outlined text-[20px] text-on-surface-variant hover:text-on-surface transition-colors"
          >
            arrow_back
          </button>

          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => save({ title })}
            placeholder="Untitled"
            className="flex-1 bg-transparent font-headline text-lg font-bold text-on-surface placeholder:text-on-surface-variant focus:outline-none"
          />

          <div className="flex items-center gap-2">
            {saving && (
              <span className="font-label text-[11px] uppercase tracking-widest text-on-surface-variant">
                Saving…
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
              <span className="material-symbols-outlined text-[18px]">
                info
              </span>
            </button>
          </div>
        </div>

        {/* Writing canvas */}
        <div className="flex-1 overflow-y-auto px-12 py-8">
          <NoteEditor
            content={body}
            onChange={(html) => {
              setBody(html);
              save({ body: html });
            }}
            placeholder="Start writing your thoughts…"
          />
        </div>
      </div>

      {/* Inspector drawer */}
      {inspectorOpen && (
        <aside className="w-72 shrink-0 overflow-y-auto bg-surface-container-low border-l-0 p-6 space-y-6">
          {/* Category */}
          <div>
            <p className="font-label text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant mb-3">
              Category
            </p>
            <div className="space-y-1">
              {PARA_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setCategory(cat);
                    save({ category: cat });
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    category === cat
                      ? "bg-surface-container-lowest text-on-surface shadow-ambient"
                      : "text-on-surface-variant hover:bg-surface-container"
                  )}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {PARA_ICONS[cat]}
                  </span>
                  {PARA_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <p className="font-label text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant mb-3">
              Tags
            </p>
            {note.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {note.tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="rounded bg-surface-container px-2 py-0.5 font-label text-[11px] text-on-surface-variant"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : (
              <p className="font-body text-xs text-on-surface-variant">
                No tags yet.
              </p>
            )}
          </div>

          {/* Backlinks */}
          <div>
            <p className="font-label text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant mb-3">
              Linked from
            </p>
            {note.linkedFrom.length > 0 ? (
              <div className="space-y-1.5">
                {note.linkedFrom.map((linked: { id: string; title: string }) => (
                  <a
                    key={linked.id}
                    href={`/note/${linked.id}`}
                    className="block truncate rounded-lg px-3 py-1.5 font-body text-sm text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
                  >
                    {linked.title || "Untitled"}
                  </a>
                ))}
              </div>
            ) : (
              <p className="font-body text-xs text-on-surface-variant">
                No backlinks yet.
              </p>
            )}
          </div>

          {/* Metadata */}
          <div className="pt-4 border-t border-outline-variant/15 space-y-2">
            <div>
              <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
                Last edited
              </p>
              <p className="font-body text-xs text-on-surface">
                {new Date(note.updatedAt).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
                Created
              </p>
              <p className="font-body text-xs text-on-surface">
                {new Date(note.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
