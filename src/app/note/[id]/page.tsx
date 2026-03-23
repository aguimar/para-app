"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { NoteEditor } from "@/components/notes/NoteEditor";
import { ParaBadge } from "@/components/ui/ParaBadge";
import { IconPicker } from "@/components/ui/IconPicker";
import { cn } from "@/lib/utils";
import { type ParaCategory, PARA_CATEGORIES, PARA_LABELS } from "@/types";
import { PARA_ICONS } from "@/lib/para-icons";
import { ArrowLeft, Trash, CircleNotch, FloppyDisk, Info, Sparkle } from "@phosphor-icons/react";
import { NoteAttachments } from "@/components/notes/NoteAttachments";

export default function NoteEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: note, isLoading } = trpc.note.byId.useQuery({ id: params.id });
  const updateNote = trpc.note.update.useMutation();
  const deleteNote = trpc.note.delete.useMutation();

  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<ParaCategory>("INBOX");
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [initializedId, setInitializedId] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<{ category: ParaCategory; reason: string } | null>(null);

  const suggestCategory = trpc.note.suggestCategory.useMutation({
    onSuccess: (data) => setSuggestion(data as { category: ParaCategory; reason: string }),
  });

  useEffect(() => {
    if (note && initializedId !== params.id) {
      setTitle(note.title);
      setIcon((note as any).icon ?? "");
      setBody(note.body);
      setCategory(note.category as ParaCategory);
      setInitializedId(params.id);
    }
  }, [note, initializedId, params.id]);

  const getCategoryPath = useCallback((cat: ParaCategory, slug: string) => {
    const map: Record<ParaCategory, string> = {
      INBOX:    "/dashboard",
      PROJECT:  `/${slug}/projects`,
      AREA:     `/${slug}/areas`,
      RESOURCE: `/${slug}/resources`,
      ARCHIVE:  `/${slug}/archive`,
    };
    return map[cat];
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await updateNote.mutateAsync({
        id: params.id,
        title,
        body,
        category,
        // Clear parent IDs that don't match the new category
        projectId:  category === "PROJECT"  ? undefined : null,
        areaId:     category === "AREA"     ? undefined : null,
        resourceId: category === "RESOURCE" ? undefined : null,
      });
      utils.note.invalidate();
      setIsDirty(false);
      router.refresh();
      const slug = (note as any)?.workspace?.slug ?? "";
      router.push(getCategoryPath(category, slug));
    } finally {
      setSaving(false);
    }
  }, [params.id, updateNote, title, body, category, note, router, getCategoryPath, utils]);

  const discard = useCallback(() => {
    if (note) {
      setTitle(note.title);
      setBody(note.body);
      setCategory(note.category as ParaCategory);
      setIsDirty(false);
    }
  }, [note]);

  const goBack = useCallback(async () => {
    if (isDirty) {
      const confirmed = window.confirm("You have unsaved changes. Save before leaving?");
      if (confirmed) await save();
    }
    // Navigate to dashboard so the server component re-renders fresh
    router.push("/dashboard");
  }, [isDirty, save, note, router]);

  // Ctrl/Cmd+S to save
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

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface">
        <CircleNotch size={32} className="animate-spin text-on-surface-variant" />
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

  if (initializedId !== params.id) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface">
        <CircleNotch size={32} className="animate-spin text-on-surface-variant" />
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
            onClick={goBack}
            className="text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <ArrowLeft size={20} />
          </button>

          <IconPicker
            entityType="note"
            entityId={params.id}
            currentIcon={icon}
            entityTitle={title}
            accentClass="text-on-surface-variant"
            bgClass="bg-surface-container"
            onIconChange={setIcon}
          />

          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setIsDirty(true);
            }}
            placeholder="Untitled"
            className="flex-1 bg-transparent font-headline text-lg font-bold text-on-surface placeholder:text-on-surface-variant focus:outline-none"
          />

          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                if (!window.confirm("Delete this note? This cannot be undone.")) return;
                await deleteNote.mutateAsync({ id: params.id });
                router.push("/dashboard");
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-error-container hover:text-on-error-container transition-colors"
              title="Delete note"
            >
              <Trash size={18} />
            </button>

            {isDirty && (
              <>
                <button
                  onClick={discard}
                  className="font-label text-[11px] font-bold uppercase tracking-widest text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  Discard
                </button>
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
              </>
            )}

            {!isDirty && (
              <span className="font-label text-[11px] uppercase tracking-widest text-on-surface-variant">
                Saved
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
            key={note.id}
            content={body}
            onChange={(html) => {
              setBody(html);
              setIsDirty(true);
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
            <div className="flex items-center justify-between mb-3">
              <p className="font-label text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant">
                Category
              </p>
              <button
                onClick={() => suggestCategory.mutate({ id: params.id })}
                disabled={suggestCategory.isPending}
                title="Sugerir categoria com IA"
                className="flex items-center gap-1 rounded-md px-2 py-1 text-on-surface-variant opacity-50 hover:opacity-100 hover:bg-surface-container transition-all"
              >
                {suggestCategory.isPending ? (
                  <CircleNotch size={12} className="animate-spin" />
                ) : (
                  <Sparkle size={12} />
                )}
                <span className="font-label text-[10px] uppercase tracking-wider">
                  {suggestCategory.isPending ? "…" : "Sugerir"}
                </span>
              </button>
            </div>

            {suggestion && (
              <div className="mb-2 rounded-lg border border-primary/20 bg-primary-container/30 px-3 py-2">
                <p className="font-body text-xs text-primary leading-snug">{suggestion.reason}</p>
                <button
                  onClick={() => setSuggestion(null)}
                  className="mt-1 font-label text-[10px] text-primary/60 hover:text-primary/100 transition-colors uppercase tracking-wider"
                >
                  Dispensar
                </button>
              </div>
            )}

            <div className="space-y-1">
              {PARA_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setCategory(cat);
                    setIsDirty(true);
                    setSuggestion(null);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                    category === cat
                      ? "bg-surface-container-lowest text-on-surface shadow-ambient"
                      : "text-on-surface-variant hover:bg-surface-container",
                    suggestion?.category === cat && category !== cat
                      ? "ring-2 ring-primary/40 ring-offset-1"
                      : ""
                  )}
                >
                  {(() => { const CatIcon = PARA_ICONS[cat]; return <CatIcon size={16} />; })()}
                  {PARA_LABELS[cat]}
                  {suggestion?.category === cat && category !== cat && (
                    <Sparkle size={11} className="ml-auto text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Attachments */}
          <NoteAttachments noteId={params.id} />

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
              <p className="font-body text-xs text-on-surface-variant">No tags yet.</p>
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
              <p className="font-body text-xs text-on-surface-variant">No backlinks yet.</p>
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
