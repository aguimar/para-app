"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { NoteEditor } from "@/components/notes/NoteEditor";
import { ParaBadge } from "@/components/ui/ParaBadge";
import { IconPicker } from "@/components/ui/IconPicker";
import { cn, extractContactsFromBody, type NoteContact } from "@/lib/utils";
import { type ParaCategory, PARA_CATEGORIES, PARA_LABELS } from "@/types";
import { PARA_ICONS } from "@/lib/para-icons";
import { ArrowLeft, Trash, CircleNotch, FloppyDisk, Info, Sparkle, X } from "@phosphor-icons/react";
import { NoteAttachments } from "@/components/notes/NoteAttachments";
import { NoteComments } from "@/components/notes/NoteComments";
import { useTranslation } from "@/lib/i18n-client";

export default function NoteEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();
  const t = useTranslation();

  const { data: note, isLoading } = trpc.note.byId.useQuery({ id: params.id });
  const updateNote = trpc.note.update.useMutation();
  const deleteNote = trpc.note.delete.useMutation();

  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<ParaCategory>("INBOX");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [resourceId, setResourceId] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [initializedId, setInitializedId] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<{ category: ParaCategory; reason: string } | null>(null);
  const [contacts, setContacts] = useState<NoteContact[]>([]);

  // Open inspector by default on desktop only
  useEffect(() => {
    if (window.innerWidth >= 768) setInspectorOpen(true);
  }, []);

  const suggestCategory = trpc.note.suggestCategory.useMutation({
    onSuccess: (data) => setSuggestion(data as { category: ParaCategory; reason: string }),
  });

  useEffect(() => {
    if (note && initializedId !== params.id) {
      setTitle(note.title);
      setIcon((note as any).icon ?? "");
      setBody(note.body);
      setCategory(note.category as ParaCategory);
      setProjectId((note as any).projectId ?? null);
      setResourceId((note as any).resourceId ?? null);
      setDueDate((note as any).dueDate ? new Date((note as any).dueDate).toISOString().split("T")[0] : "");
      setStartDate((note as any).startDate ? new Date((note as any).startDate).toISOString().split("T")[0] : "");
      const noteContacts = Array.isArray((note as any).contacts)
        ? (note as any).contacts as NoteContact[]
        : [];
      setContacts(noteContacts);
      setInitializedId(params.id);
    }
  }, [note, initializedId, params.id]);

  const workspaceId = (note as any)?.workspace?.id ?? "";
  const { data: projects = [] } = trpc.project.list.useQuery(
    { workspaceId },
    { enabled: category === "PROJECT" && !!workspaceId }
  );
  const { data: resources = [] } = trpc.resource.list.useQuery(
    { workspaceId },
    { enabled: category === "RESOURCE" && !!workspaceId }
  );

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
      const extractedContacts = extractContactsFromBody(body);
      await updateNote.mutateAsync({
        id: params.id,
        title,
        body,
        category,
        contacts: extractedContacts,
        projectId:  category === "PROJECT"  ? projectId  : null,
        areaId:     category === "AREA"     ? undefined  : null,
        resourceId: category === "RESOURCE" ? resourceId : null,
        dueDate:    category === "PROJECT" && dueDate   ? new Date(dueDate)   : null,
        startDate:  category === "PROJECT" && startDate ? new Date(startDate) : null,
      });
      setContacts(extractedContacts);
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
      setProjectId((note as any).projectId ?? null);
      setResourceId((note as any).resourceId ?? null);
      setDueDate((note as any).dueDate ? new Date((note as any).dueDate).toISOString().split("T")[0] : "");
      setStartDate((note as any).startDate ? new Date((note as any).startDate).toISOString().split("T")[0] : "");
      const noteContacts = Array.isArray((note as any).contacts)
        ? (note as any).contacts as NoteContact[]
        : [];
      setContacts(noteContacts);
      setIsDirty(false);
    }
  }, [note]);

  const goBack = useCallback(async () => {
    if (isDirty) {
      const confirmed = window.confirm(t.noteEditor.unsavedChanges);
      if (confirmed) await save();
    }
    router.push("/dashboard");
  }, [isDirty, save, note, router, t]);

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
        <p className="font-body text-on-surface-variant">{t.noteEditor.notFound}</p>
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

  const inspectorContent = (
    <>
      {/* Category */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="font-label text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant">
            {t.noteEditor.category}
          </p>
          <button
            onClick={() => suggestCategory.mutate({ id: params.id })}
            disabled={suggestCategory.isPending}
            title={t.noteEditor.suggestCategory}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-on-surface-variant opacity-50 hover:opacity-100 hover:bg-surface-container transition-all"
          >
            {suggestCategory.isPending ? (
              <CircleNotch size={12} className="animate-spin" />
            ) : (
              <Sparkle size={12} />
            )}
            <span className="font-label text-[10px] uppercase tracking-wider">
              {suggestCategory.isPending ? "…" : t.noteEditor.suggest}
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
              {t.noteEditor.dismiss}
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

      {/* Project picker */}
      {category === "PROJECT" && (
        <div>
          <p className="font-label text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant mb-3">
            {t.noteEditor.project}
          </p>
          <select
            value={projectId ?? ""}
            onChange={(e) => {
              setProjectId(e.target.value || null);
              setIsDirty(true);
            }}
            className="w-full rounded-xl bg-surface-container px-3 py-2 font-body text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">{t.noteEditor.noProject}</option>
            {projects
              .filter((p) => p.status !== "COMPLETED")
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
          </select>
        </div>
      )}

      {/* Date fields for PROJECT notes */}
      {category === "PROJECT" && (
        <div className="space-y-3">
          <div>
            <p className="font-label text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant mb-1.5">
              {t.noteEditor.startDate}
            </p>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setIsDirty(true);
              }}
              className="w-full rounded-xl bg-surface-container px-3 py-2 font-body text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <p className="font-label text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant mb-1.5">
              {t.noteEditor.dueDate}
            </p>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => {
                setDueDate(e.target.value);
                setIsDirty(true);
              }}
              className="w-full rounded-xl bg-surface-container px-3 py-2 font-body text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      )}

      {/* Resource picker */}
      {category === "RESOURCE" && (
        <div>
          <p className="font-label text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant mb-3">
            {t.noteEditor.resource}
          </p>
          <select
            value={resourceId ?? ""}
            onChange={(e) => {
              setResourceId(e.target.value || null);
              setIsDirty(true);
            }}
            className="w-full rounded-xl bg-surface-container px-3 py-2 font-body text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-tertiary/20"
          >
            <option value="">{t.noteEditor.noResource}</option>
            {resources.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Attachments */}
      <NoteAttachments noteId={params.id} />

      {/* Comments — PROJECT notes only */}
      {category === "PROJECT" && (
        <NoteComments noteId={params.id} />
      )}

      {/* Tags */}
      <div>
        <p className="font-label text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant mb-3">
          {t.noteEditor.tags}
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
          <p className="font-body text-xs text-on-surface-variant">{t.noteEditor.noTags}</p>
        )}
      </div>

      {/* Contacts */}
      {contacts.length > 0 && (
        <div>
          <p className="font-label text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant mb-3">
            {t.noteEditor.contacts ?? "Contacts"}
          </p>
          <div className="space-y-1.5">
            {contacts.map((contact) => (
              <div
                key={contact.googleId}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 bg-surface-container"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-[11px] font-bold text-purple-400">
                  {contact.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-headline text-xs font-semibold text-on-surface truncate">
                    {contact.name}
                  </p>
                  <p className="font-body text-[10px] text-on-surface-variant truncate">
                    {contact.email}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Backlinks */}
      <div>
        <p className="font-label text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant mb-3">
          {t.noteEditor.linkedFrom}
        </p>
        {note.linkedFrom.length > 0 ? (
          <div className="space-y-1.5">
            {note.linkedFrom.map((linked: { id: string; title: string }) => (
              <a
                key={linked.id}
                href={`/note/${linked.id}`}
                className="block truncate rounded-lg px-3 py-1.5 font-body text-sm text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
              >
                {linked.title || t.common.untitled}
              </a>
            ))}
          </div>
        ) : (
          <p className="font-body text-xs text-on-surface-variant">{t.noteEditor.noBacklinks}</p>
        )}
      </div>

      {/* Metadata */}
      <div className="pt-4 border-t border-outline-variant/15 space-y-2">
        <div>
          <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
            {t.noteEditor.lastEdited}
          </p>
          <p className="font-body text-xs text-on-surface">
            {new Date(note.updatedAt).toLocaleString()}
          </p>
        </div>
        <div>
          <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
            {t.noteEditor.created}
          </p>
          <p className="font-body text-xs text-on-surface">
            {new Date(note.createdAt).toLocaleString()}
          </p>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-surface-container-lowest">
      {/* Editor area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex h-14 shrink-0 items-center gap-2 px-3 md:gap-3 md:px-6 bg-surface-container-lowest">
          <button
            onClick={goBack}
            className="text-on-surface-variant hover:text-on-surface transition-colors shrink-0"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="hidden md:block">
            <IconPicker
              entityType="note"
              entityId={params.id}
              currentIcon={icon}
              entityTitle={title}
              accentClass="text-on-surface-variant"
              bgClass="bg-surface-container"
              onIconChange={setIcon}
            />
          </div>

          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setIsDirty(true);
            }}
            placeholder={t.common.untitled}
            className="flex-1 min-w-0 bg-transparent font-headline text-base md:text-lg font-bold text-on-surface placeholder:text-on-surface-variant focus:outline-none"
          />

          <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
            <button
              onClick={async () => {
                if (!window.confirm(t.noteEditor.deleteConfirm)) return;
                await deleteNote.mutateAsync({ id: params.id });
                router.push("/dashboard");
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-error-container hover:text-on-error-container transition-colors"
              title={t.noteEditor.deleteNote}
            >
              <Trash size={18} />
            </button>

            {isDirty && (
              <>
                <button
                  onClick={discard}
                  className="hidden md:block font-label text-[11px] font-bold uppercase tracking-widest text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  {t.common.discard}
                </button>
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
              </>
            )}

            {!isDirty && (
              <span className="hidden md:inline font-label text-[11px] uppercase tracking-widest text-on-surface-variant">
                {t.common.saved}
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
            key={note.id}
            noteId={params.id}
            content={body}
            onChange={(html) => {
              setBody(html);
              setIsDirty(true);
            }}
            placeholder={t.noteEditor.placeholder}
          />
        </div>
      </div>

      {/* Inspector — desktop: side panel */}
      {inspectorOpen && (
        <aside className="hidden md:block w-72 shrink-0 overflow-y-auto bg-surface-container-low border-l-0 p-6 space-y-6">
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
            {/* Drag handle + close */}
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
