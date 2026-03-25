"use client";

import { useState } from "react";
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
  type Icon,
} from "@phosphor-icons/react";
import { useTranslation } from "@/lib/i18n-client";

interface InboxNote {
  id: string;
  title: string;
  updatedAt: Date | string;
}

interface InboxBoardProps {
  workspaceId: string;
  inboxNotes: InboxNote[];
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

// ─── Draggable note card ──────────────────────────────────────────────────────

function DraggableNote({
  note,
  isDragging,
  onAssign,
}: {
  note: InboxNote;
  isDragging?: boolean;
  onAssign: (noteId: string, category: CategoryId) => void;
}) {
  const router = useRouter();
  const t = useTranslation();
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: note.id });
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
      className={cn("rounded-xl bg-surface-container-lowest shadow-ambient select-none transition-shadow", isDragging && "opacity-40")}
    >
      {/* Drag handle row */}
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        onDoubleClick={() => router.push(`/note/${note.id}`)}
        className="flex items-center gap-2 cursor-grab px-4 pt-3 pb-2 active:cursor-grabbing"
      >
        <DotsSixVertical size={16} className="shrink-0 text-on-surface-variant" />
        <p className="flex-1 truncate font-body text-sm font-medium text-on-surface">
          {note.title || t.common.untitled}
        </p>
      </div>

      {/* Suggestion result */}
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

      {/* AI suggest button */}
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

// ─── Main InboxBoard ──────────────────────────────────────────────────────────

export function InboxBoard({ inboxNotes: initialNotes }: InboxBoardProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const router = useRouter();
  const t = useTranslation();
  const assignNote = trpc.note.assign.useMutation({ onSuccess: () => router.refresh() });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const activeNote = notes.find((n) => n.id === activeNoteId) ?? null;

  function handleDragStart(event: DragStartEvent) {
    setActiveNoteId(event.active.id as string);
  }

  function handleDragOver(event: { over: { id: string } | null }) {
    setOverId(event.over?.id ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveNoteId(null);
    setOverId(null);

    if (!over) return;

    const noteId = active.id as string;
    const category = over.id as CategoryId;

    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    await assignNote.mutateAsync({ noteId, category });
  }

  function handleAssign(noteId: string, category: CategoryId) {
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    assignNote.mutate({ noteId, category });
  }

  if (notes.length === 0) return null;

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
            {notes.length}
          </span>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row">
          {/* Notes column */}
          <div className="flex shrink-0 flex-col gap-2 lg:w-52">
            {notes.map((note) => (
              <DraggableNote
                key={note.id}
                note={note}
                isDragging={activeNoteId === note.id}
                onAssign={handleAssign}
              />
            ))}
            <p className="mt-1 font-label text-[10px] text-on-surface-variant">
              {t.inbox.dragHint}
            </p>
          </div>

          {/* 4 category drop zones */}
          <div className="flex-1 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {CATEGORIES.map((cat) => (
              <CategoryZone key={cat.id} category={cat} isOver={overId === cat.id} />
            ))}
          </div>
        </div>
      </section>

      <DragOverlay>
        {activeNote ? <NoteGhost note={activeNote} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
