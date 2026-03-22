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
    label: "Project",
    icon: "rocket_launch",
    color: "text-primary",
    activeColor: "bg-primary-container text-on-primary-container border-primary/40",
  },
  {
    id: "AREA",
    label: "Area",
    icon: "hub",
    color: "text-secondary",
    activeColor: "bg-secondary-container text-on-secondary-container border-secondary/40",
  },
  {
    id: "RESOURCE",
    label: "Resource",
    icon: "book_2",
    color: "text-tertiary",
    activeColor: "bg-tertiary-container text-on-tertiary-container border-tertiary/40",
  },
  {
    id: "ARCHIVE",
    label: "Archive",
    icon: "inventory_2",
    color: "text-outline",
    activeColor: "bg-surface-container-highest text-on-surface-variant border-outline/40",
  },
] as const;

// ─── Draggable note card ──────────────────────────────────────────────────────

function DraggableNote({ note, isDragging }: { note: InboxNote; isDragging?: boolean }) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: note.id });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onDoubleClick={() => router.push(`/note/${note.id}`)}
      className={cn(
        "cursor-grab rounded-xl bg-surface-container-lowest px-4 py-3 shadow-ambient select-none transition-shadow active:cursor-grabbing",
        isDragging && "opacity-40"
      )}
    >
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
          drag_indicator
        </span>
        <p className="truncate font-body text-sm font-medium text-on-surface">
          {note.title || "Untitled"}
        </p>
      </div>
    </div>
  );
}

// ─── Ghost card shown while dragging ─────────────────────────────────────────

function NoteGhost({ note }: { note: InboxNote }) {
  return (
    <div className="cursor-grabbing rounded-xl bg-surface-container-lowest px-4 py-3 shadow-[0_16px_48px_rgba(42,52,57,0.18)] ring-2 ring-primary/20 select-none rotate-2">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[16px] text-primary">drag_indicator</span>
        <p className="truncate font-body text-sm font-medium text-on-surface">
          {note.title || "Untitled"}
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
      <span className={cn("material-symbols-outlined text-[28px]", isOver && category.color)}>
        {category.icon}
      </span>
      <p className={cn("font-label text-[11px] font-bold uppercase tracking-widest", isOver && category.color)}>
        {category.label}
      </p>
    </div>
  );
}

// ─── Main InboxBoard ──────────────────────────────────────────────────────────

export function InboxBoard({ inboxNotes: initialNotes }: InboxBoardProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const assignNote = trpc.note.assign.useMutation();

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
    const category = over.id as "PROJECT" | "AREA" | "RESOURCE" | "ARCHIVE";

    setNotes((prev) => prev.filter((n) => n.id !== noteId));

    await assignNote.mutateAsync({ noteId, category });
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
          <span className="material-symbols-outlined text-[18px] text-on-surface-variant">inbox</span>
          <h2 className="font-headline text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
            Inbox
          </h2>
          <span className="ml-auto rounded bg-surface-container px-2 py-0.5 font-label text-[10px] font-semibold text-on-surface-variant">
            {notes.length}
          </span>
        </div>

        <div className="flex gap-4">
          {/* Notes column */}
          <div className="flex w-52 shrink-0 flex-col gap-2">
            {notes.map((note) => (
              <DraggableNote
                key={note.id}
                note={note}
                isDragging={activeNoteId === note.id}
              />
            ))}
            <p className="mt-1 font-label text-[10px] text-on-surface-variant">
              ← drag onto a category
            </p>
          </div>

          {/* 4 category drop zones */}
          <div className="flex-1 grid grid-cols-4 gap-3">
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
