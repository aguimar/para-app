"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  Rocket, TreeStructure, Books, Archive, Tray,
  DotsSixVertical, Sparkle, CircleNotch, Check, X,
  CaretRight, CaretDown,
} from "@phosphor-icons/react";
import { useTranslation } from "@/lib/i18n-client";

interface InboxNote {
  id: string;
  title: string;
  updatedAt: Date | string;
}

interface InboxGroup {
  id: string;
  title: string;
  updatedAt: Date | string;
  notes: InboxNote[];
}

interface InboxBoardProps {
  workspaceId: string;
  inboxNotes: InboxNote[];
  inboxGroups: InboxGroup[];
}

const CATEGORIES = [
  {
    id: "PROJECT",
    dictKey: "project" as const,
    Icon: Rocket,
    color: "text-primary",
    activeColor: "bg-primary-container text-on-primary-container border-primary/40",
    suggestionColor: "bg-primary-container/60 text-primary border-primary/30",
  },
  {
    id: "AREA",
    dictKey: "area" as const,
    Icon: TreeStructure,
    color: "text-secondary",
    activeColor: "bg-secondary-container text-on-secondary-container border-secondary/40",
    suggestionColor: "bg-secondary-container/60 text-secondary border-secondary/30",
  },
  {
    id: "RESOURCE",
    dictKey: "resource" as const,
    Icon: Books,
    color: "text-tertiary",
    activeColor: "bg-tertiary-container text-on-tertiary-container border-tertiary/40",
    suggestionColor: "bg-tertiary-container/60 text-tertiary border-tertiary/30",
  },
  {
    id: "ARCHIVE",
    dictKey: "archive" as const,
    Icon: Archive,
    color: "text-outline",
    activeColor: "bg-surface-container-highest text-on-surface-variant border-outline/40",
    suggestionColor: "bg-surface-container-high text-on-surface-variant border-outline/30",
  },
] as const;

type CategoryId = (typeof CATEGORIES)[number]["id"];

interface Suggestion {
  category: CategoryId;
  reason: string;
}

type ActiveDragItem =
  | { type: "note"; id: string }
  | { type: "group"; id: string };

// ─── Draggable note card (also a droppable, to support drop-onto-note) ────────

function DraggableNote({
  note,
  isDragging,
  onAssign,
  draggable = true,
}: {
  note: InboxNote;
  isDragging?: boolean;
  onAssign: (noteId: string, category: CategoryId) => void;
  draggable?: boolean;
}) {
  const router = useRouter();
  const t = useTranslation();
  const { attributes, listeners, setNodeRef: setDragRef, transform } = useDraggable({
    id: note.id,
    disabled: !draggable,
  });
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: `note:${note.id}` });
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);

  const suggest = trpc.note.suggestCategory.useMutation({
    onSuccess: (data) => setSuggestion(data as Suggestion),
    onError: (err) => alert(err.message),
  });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  const suggestedCat = suggestion
    ? CATEGORIES.find((c) => c.id === suggestion.category)
    : null;

  return (
    <div
      ref={setDropRef}
      className={cn(
        "rounded-xl bg-surface-container-lowest shadow-ambient select-none transition-all",
        isDragging && "opacity-40",
        isOver && !isDragging && "ring-2 ring-primary/50 scale-[1.02]",
      )}
    >
      <div
        ref={setDragRef}
        style={style}
        {...listeners}
        {...attributes}
        onDoubleClick={() => router.push(`/note/${note.id}`)}
        className={cn(
          "flex items-center gap-2 px-4 pt-3 pb-2",
          draggable ? "cursor-grab active:cursor-grabbing" : "cursor-default"
        )}
      >
        <DotsSixVertical
          size={16}
          className={cn("shrink-0 text-on-surface-variant", !draggable && "opacity-30")}
        />
        <p className="flex-1 truncate font-body text-sm font-medium text-on-surface">
          {note.title || t.common.untitled}
        </p>
      </div>

      {suggestion && suggestedCat && (
        <div className={cn("mx-3 mb-2 rounded-lg border px-3 py-2", suggestedCat.suggestionColor)}>
          <div className="flex items-start gap-2">
            <suggestedCat.Icon size={14} className="mt-0.5 shrink-0" />
            <p className="flex-1 font-body text-xs leading-snug">{suggestion.reason}</p>
          </div>
          <div className="mt-2 flex gap-1.5">
            <button
              onClick={() => {
                onAssign(note.id, suggestion.category);
                setSuggestion(null);
              }}
              className="flex items-center gap-1 rounded-md bg-white/30 px-2.5 py-1 font-label text-[10px] font-bold uppercase tracking-wider transition-colors hover:bg-white/50"
            >
              <Check size={11} />
              {t.common.apply}
            </button>
            <button
              onClick={() => setSuggestion(null)}
              className="flex items-center gap-1 rounded-md px-2 py-1 font-label text-[10px] font-bold uppercase tracking-wider opacity-60 transition-opacity hover:opacity-100"
            >
              <X size={11} />
            </button>
          </div>
        </div>
      )}

      {!suggestion && (
        <div className="px-4 pb-2.5">
          <button
            onClick={() => suggest.mutate({ id: note.id })}
            disabled={suggest.isPending}
            className="flex items-center gap-1 text-on-surface-variant opacity-50 hover:opacity-100 transition-opacity"
          >
            {suggest.isPending ? (
              <CircleNotch size={12} className="animate-spin" />
            ) : (
              <Sparkle size={12} />
            )}
            <span className="font-label text-[10px] uppercase tracking-wider">
              {suggest.isPending ? t.inbox.analyzing : t.inbox.suggest}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Group card (droppable container) ────────────────────────────────────────

function GroupCard({
  group,
  isExpanded,
  isDropOver,
  isDragging,
  onToggle,
  onRename,
  onDelete,
  onAssignChild,
}: {
  group: InboxGroup;
  isExpanded: boolean;
  isDropOver: boolean;
  isDragging: boolean;
  onToggle: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
  onAssignChild: (noteId: string, category: CategoryId) => void;
}) {
  const { setNodeRef } = useDroppable({ id: `group:${group.id}` });
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    transform,
  } = useDraggable({ id: `group-card:${group.id}` });
  const t = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(group.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-xl bg-surface-container shadow-ambient select-none transition-all",
        isDragging && "opacity-40",
        isDropOver && "ring-2 ring-primary/50 scale-[1.02]",
      )}
    >
      <div
        ref={setDragRef}
        style={style}
        {...listeners}
        {...attributes}
        className="flex cursor-grab items-center gap-2 px-3 pt-2.5 pb-2 active:cursor-grabbing"
      >
        <button
          onClick={onToggle}
          className="shrink-0 text-on-surface-variant hover:text-on-surface"
          aria-label={t.inbox.group.toggle}
        >
          {isExpanded ? <CaretDown size={14} /> : <CaretRight size={14} />}
        </button>
        {editing ? (
          <input
            ref={inputRef}
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              setEditing(false);
              const next = draft.trim();
              if (next && next !== group.title) onRename(next);
              else setDraft(group.title);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") { setDraft(group.title); setEditing(false); }
            }}
            className="flex-1 bg-transparent font-body text-sm font-semibold text-on-surface outline-none"
          />
        ) : (
          <button
            onClick={() => { setDraft(group.title); setEditing(true); }}
            className="flex-1 truncate text-left font-body text-sm font-semibold text-on-surface"
          >
            {group.title}
          </button>
        )}
        <span className="rounded bg-surface-container-high px-1.5 py-0.5 font-label text-[10px] font-semibold text-on-surface-variant">
          {group.notes.length}
        </span>
        <button
          onClick={onDelete}
          className="text-on-surface-variant opacity-50 hover:opacity-100 hover:text-error"
          aria-label={t.inbox.group.delete}
        >
          <X size={12} />
        </button>
      </div>
      {isExpanded && group.notes.length > 0 && (
        <div className="flex flex-col gap-2 px-2 pb-2">
          {group.notes.map((n) => (
            <DraggableNote key={n.id} note={n} onAssign={onAssignChild} draggable={false} />
          ))}
        </div>
      )}
    </div>
  );
}

function GroupGhost({ group }: { group: InboxGroup }) {
  const t = useTranslation();
  return (
    <div className="cursor-grabbing rounded-xl bg-surface-container px-4 py-3 shadow-[0_16px_48px_rgba(42,52,57,0.18)] ring-2 ring-primary/20 select-none rotate-2">
      <div className="flex items-center gap-2">
        <DotsSixVertical size={16} className="text-primary" />
        <p className="truncate font-body text-sm font-semibold text-on-surface">
          {group.title || t.inbox.group.defaultTitle}
        </p>
        <span className="rounded bg-surface-container-high px-1.5 py-0.5 font-label text-[10px] font-semibold text-on-surface-variant">
          {group.notes.length}
        </span>
      </div>
    </div>
  );
}

// ─── Ghost card shown while dragging ─────────────────────────────────────────

function NoteGhost({ note }: { note: InboxNote }) {
  const t = useTranslation();
  return (
    <div className="cursor-grabbing rounded-xl bg-surface-container-lowest px-4 py-3 shadow-[0_16px_48px_rgba(42,52,57,0.18)] ring-2 ring-primary/20 select-none rotate-2">
      <div className="flex items-center gap-2">
        <DotsSixVertical size={16} className="text-primary" />
        <p className="truncate font-body text-sm font-medium text-on-surface">
          {note.title || t.common.untitled}
        </p>
      </div>
    </div>
  );
}

// ─── Droppable category zone ──────────────────────────────────────────────────

function CategoryZone({
  category,
  isOver,
}: {
  category: (typeof CATEGORIES)[number];
  isOver: boolean;
}) {
  const { setNodeRef } = useDroppable({ id: category.id });
  const t = useTranslation();

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-all duration-200",
        isOver
          ? `${category.activeColor} scale-105`
          : "border-outline-variant/30 text-on-surface-variant hover:border-outline-variant/60"
      )}
    >
      <category.Icon size={28} className={cn(isOver && category.color)} />
      <p className={cn("font-label text-[11px] font-bold uppercase tracking-widest", isOver && category.color)}>
        {t.para[category.dictKey]}
      </p>
    </div>
  );
}

function UngroupZone({ isOver, visible }: { isOver: boolean; visible: boolean }) {
  const { setNodeRef } = useDroppable({ id: "ungroup" });
  const t = useTranslation();

  if (!visible) return null;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-xl border-2 border-dashed px-4 py-3 transition-all duration-200",
        isOver
          ? "border-primary/50 bg-primary-container/40 text-on-surface scale-[1.02]"
          : "border-outline-variant/40 bg-surface-container-lowest text-on-surface-variant"
      )}
    >
      <p className="font-label text-[11px] font-bold uppercase tracking-widest">
        {isOver ? t.inbox.group.ungroupActive : t.inbox.group.ungroupTarget}
      </p>
    </div>
  );
}

// ─── Main InboxBoard ──────────────────────────────────────────────────────────

export function InboxBoard({ workspaceId, inboxNotes: initialNotes, inboxGroups: initialGroups }: InboxBoardProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [groups, setGroups] = useState(initialGroups.filter((group) => group.notes.length >= 2));
  const [activeDragItem, setActiveDragItem] = useState<ActiveDragItem | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(() => new Set(initialGroups.map((g) => g.id)));

  const router = useRouter();
  const t = useTranslation();
  const assignNote = trpc.note.assign.useMutation({ onSuccess: () => router.refresh() });
  const createGroup = trpc.noteGroup.createFromNotes.useMutation({ onSuccess: () => router.refresh() });
  const addToGroup = trpc.noteGroup.addNote.useMutation({ onSuccess: () => router.refresh() });
  const renameGroup = trpc.noteGroup.rename.useMutation({ onSuccess: () => router.refresh() });
  const deleteGroup = trpc.noteGroup.delete.useMutation({ onSuccess: () => router.refresh() });
  const assignGroup = trpc.noteGroup.assign.useMutation({ onSuccess: () => router.refresh() });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const activeNote =
    activeDragItem?.type === "note"
      ? notes.find((n) => n.id === activeDragItem.id) ??
        groups.flatMap((g) => g.notes).find((n) => n.id === activeDragItem.id) ??
        null
      : null;

  const activeGroup =
    activeDragItem?.type === "group"
      ? groups.find((group) => group.id === activeDragItem.id) ?? null
      : null;

  function handleDragStart(event: DragStartEvent) {
    const activeId = String(event.active.id);
    if (activeId.startsWith("group-card:")) {
      setActiveDragItem({ type: "group", id: activeId.slice("group-card:".length) });
      return;
    }

    setActiveDragItem({ type: "note", id: activeId });
  }

  function handleDragOver(event: { over: { id: string | number } | null }) {
    setOverId(event.over ? String(event.over.id) : null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const rawActiveId = String(active.id);
    const activeId = rawActiveId.startsWith("group-card:")
      ? rawActiveId.slice("group-card:".length)
      : rawActiveId;
    const activeType = rawActiveId.startsWith("group-card:") ? "group" : "note";
    setActiveDragItem(null);
    setOverId(null);

    if (!over) {
      return;
    }

    const dropId = String(over.id);

    if (activeType === "group") {
      const draggedGroup = groups.find((group) => group.id === activeId);
      if (!draggedGroup) return;

      if (dropId === "ungroup") {
        setGroups((prev) => prev.filter((group) => group.id !== activeId));
        setNotes((prev) => [...draggedGroup.notes, ...prev]);
        await deleteGroup.mutateAsync({ id: activeId });
        return;
      }

      const maybeCategory = CATEGORIES.find((c) => c.id === dropId);
      if (maybeCategory) {
        setGroups((prev) => prev.filter((group) => group.id !== activeId));
        await assignGroup.mutateAsync({ id: activeId, category: maybeCategory.id });
      }
      return;
    }

    // 1. Drop onto PARA category
    const maybeCategory = CATEGORIES.find((c) => c.id === dropId);
    if (maybeCategory) {
      setNotes((prev) => prev.filter((n) => n.id !== activeId));
      setGroups((prev) =>
        prev
          .map((g) => ({ ...g, notes: g.notes.filter((n) => n.id !== activeId) }))
          .filter((g) => g.notes.length >= 2)
      );
      await assignNote.mutateAsync({ noteId: activeId, category: maybeCategory.id });
      return;
    }

    // 2. Drop onto an existing group card
    if (dropId.startsWith("group:")) {
      const groupId = dropId.slice("group:".length);
      if (groups.some((g) => g.id === groupId && g.notes.some((n) => n.id === activeId))) return;
      await addToGroup.mutateAsync({ groupId, noteId: activeId });
      return;
    }

    // 3. Drop onto another note → create a new group (or add to target's group)
    if (dropId.startsWith("note:")) {
      const targetNoteId = dropId.slice("note:".length);
      if (targetNoteId === activeId) return;

      const targetGroup = groups.find((g) => g.notes.some((n) => n.id === targetNoteId));
      if (targetGroup) {
        await addToGroup.mutateAsync({ groupId: targetGroup.id, noteId: activeId });
        return;
      }

      // MVP: only group two currently-ungrouped notes together.
      const activeIsGrouped = groups.some((g) => g.notes.some((n) => n.id === activeId));
      if (activeIsGrouped) return;

      await createGroup.mutateAsync({
        workspaceId,
        noteIds: [targetNoteId, activeId],
        title: t.inbox.group.defaultTitle,
      });
      return;
    }
  }

  function handleAssign(noteId: string, category: CategoryId) {
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    setGroups((prev) =>
      prev
        .map((g) => ({ ...g, notes: g.notes.filter((n) => n.id !== noteId) }))
        .filter((g) => g.notes.length >= 2)
    );
    assignNote.mutate({ noteId, category });
  }

  if (notes.length === 0 && groups.length === 0) return null;

  return (
    <DndContext
      id="inbox-board"
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver as never}
      onDragEnd={handleDragEnd}
    >
      <section className="rounded-xl bg-surface-container-low p-5">
        <div className="mb-4 flex items-center gap-2">
          <Tray size={18} className="text-on-surface-variant" />
          <h2 className="font-headline text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
            {t.para.inbox}
          </h2>
          <span className="ml-auto rounded bg-surface-container px-2 py-0.5 font-label text-[10px] font-semibold text-on-surface-variant">
            {notes.length + groups.reduce((acc, g) => acc + g.notes.length, 0)}
          </span>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="flex shrink-0 flex-col gap-2 lg:w-52">
            {groups.map((g) => (
              <GroupCard
                key={g.id}
                group={g}
                isExpanded={expandedGroupIds.has(g.id)}
                isDragging={activeDragItem?.type === "group" && activeDragItem.id === g.id}
                isDropOver={overId === `group:${g.id}`}
                onToggle={() =>
                  setExpandedGroupIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(g.id)) next.delete(g.id);
                    else next.add(g.id);
                    return next;
                  })
                }
                onRename={(title) => {
                  setGroups((prev) => prev.map((x) => (x.id === g.id ? { ...x, title } : x)));
                  renameGroup.mutate({ id: g.id, title });
                }}
                onDelete={() => {
                  setGroups((prev) => prev.filter((x) => x.id !== g.id));
                  setNotes((prev) => [...g.notes, ...prev]);
                  deleteGroup.mutate({ id: g.id });
                }}
                onAssignChild={handleAssign}
              />
            ))}
            {notes.map((note) => (
              <DraggableNote
                key={note.id}
                note={note}
                isDragging={activeDragItem?.type === "note" && activeDragItem.id === note.id}
                onAssign={handleAssign}
              />
            ))}
            <UngroupZone
              isOver={overId === "ungroup"}
              visible={activeDragItem?.type === "group"}
            />
            <p className="mt-1 font-label text-[10px] text-on-surface-variant">
              {activeDragItem?.type === "group" ? t.inbox.dragGroupHint : t.inbox.dragHint}
            </p>
          </div>

          <div className="flex-1 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {CATEGORIES.map((cat) => (
              <CategoryZone key={cat.id} category={cat} isOver={overId === cat.id} />
            ))}
          </div>
        </div>
      </section>

      <DragOverlay>
        {activeNote ? <NoteGhost note={activeNote} /> : null}
        {activeGroup ? <GroupGhost group={activeGroup} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
