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
import { ArrowLeft, CircleNotch, FloppyDisk, Info, X } from "@phosphor-icons/react";
import { useTranslation } from "@/lib/i18n-client";

function NewNotePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workspaceId = searchParams.get("workspaceId") ?? "";
  const t = useTranslation();

  const createNote = trpc.note.create.useMutation();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<ParaCategory>("INBOX");
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Open inspector by default on desktop only
  useEffect(() => {
    if (window.innerWidth >= 768) setInspectorOpen(true);
  }, []);

  const isDirty = title.trim() !== "" || body !== "";

  const save = useCallback(async () => {
    if (!title.trim() && !body) return;
    setSaving(true);
    try {
      const note = await createNote.mutateAsync({
        workspaceId,
        title: title.trim() || t.common.untitled,
        body,
        category,
      });
      router.replace(`/note/${note.id}`);
    } finally {
      setSaving(false);
    }
  }, [workspaceId, title, body, category, createNote, router, t]);

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

  const inspectorContent = (
    <div>
      <p className="font-label text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant mb-3">
        {t.noteEditor.category}
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
  );

  return (
    <div className="flex h-screen overflow-hidden bg-surface-container-lowest">
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex h-14 shrink-0 items-center gap-2 px-3 md:gap-3 md:px-6 bg-surface-container-lowest">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-on-surface-variant hover:text-on-surface transition-colors shrink-0"
          >
            <ArrowLeft size={20} />
          </button>

          {/* placeholder icon — only on desktop */}
          <div className="hidden md:flex h-11 w-11 rounded-xl bg-surface-container items-center justify-center">
            <span className="font-headline text-base font-bold leading-none text-on-surface-variant">
              {title.trim()[0]?.toUpperCase() ?? "?"}
            </span>
          </div>

          <input
            autoFocus
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t.common.untitled}
            className="flex-1 min-w-0 bg-transparent font-headline text-base md:text-lg font-bold text-on-surface placeholder:text-on-surface-variant focus:outline-none"
          />

          <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
            {isDirty ? (
              <button
                onClick={save}
                disabled={saving}
                className={cn(
                  "flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 md:px-4 font-label text-[11px] font-bold uppercase tracking-widest text-on-primary transition-opacity",
                  saving && "opacity-60 cursor-not-allowed"
                )}
              >
                {saving ? (
                  <CircleNotch size={14} className="animate-spin" />
                ) : (
                  <FloppyDisk size={14} />
                )}
                <span className="hidden md:inline">
                  {saving ? t.common.saving : t.common.save}
                </span>
              </button>
            ) : (
              <span className="hidden md:inline font-label text-[11px] uppercase tracking-widest text-on-surface-variant">
                {t.common.notSaved}
              </span>
            )}

            <div className="hidden md:block">
              <ParaBadge category={category} />
            </div>

            <button
              onClick={() => setInspectorOpen((o) => !o)}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg transition-colors shrink-0",
                inspectorOpen
                  ? "bg-primary-container text-on-primary-container"
                  : "text-on-surface-variant hover:bg-surface-container"
              )}
              title={t.noteEditor.toggleInspector}
            >
              <Info size={18} />
            </button>
          </div>
        </div>

        {/* Writing canvas */}
        <div className="flex-1 overflow-y-auto px-4 py-6 md:px-12 md:py-8">
          <NoteEditor
            content=""
            onChange={(val) => setBody(val)}
            placeholder={t.noteEditor.placeholder}
          />
        </div>
      </div>

      {/* Inspector — desktop: side panel */}
      {inspectorOpen && (
        <aside className="hidden md:block w-72 shrink-0 overflow-y-auto bg-surface-container-low p-6 space-y-6">
          {inspectorContent}
        </aside>
      )}

      {/* Inspector — mobile: bottom sheet */}
      {inspectorOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-inverse-surface/25 backdrop-blur-[2px]"
            onClick={() => setInspectorOpen(false)}
          />
          {/* Sheet */}
          <div className="relative max-h-[75vh] overflow-y-auto rounded-t-2xl bg-surface-container-low shadow-[0_-8px_40px_rgba(42,52,57,0.15)]">
            <div className="sticky top-0 z-10 flex items-center justify-between bg-surface-container-low px-5 pt-3 pb-2">
              <div className="mx-auto h-1 w-10 rounded-full bg-outline-variant/40" />
              <button
                onClick={() => setInspectorOpen(false)}
                className="absolute right-3 top-2.5 flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-5 pb-8 space-y-6">
              {inspectorContent}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NewNotePage() {
  return (
    <Suspense fallback={<div>{/* loading */}</div>}>
      <NewNotePageContent />
    </Suspense>
  );
}
