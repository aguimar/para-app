"use client";

import { useState } from "react";
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

// ─── Types ───────────────────────────────────────────────────────────────────

interface InboxNote {
  id: string;
  title: string;
  updatedAt: Date | string;
}

interface DropTarget {
  id: string;
  label: string;
  icon: string;
  category: "PROJECT" | "AREA" | "RESOURCE" | "ARCHIVE";
  color: string;
  activeColor: string;
}

interface InboxBoardProps {
  workspaceId: string;
  inboxNotes: InboxNote[];
  projects: { id: string; title: string }[];
  areas: { id: string; title: string }[];
  resources: { id: string; title: string }[];
}

// ─── Draggable note card ──────────────────────────────────────────────────────

function DraggableNote({ note, isDragging }: { note: InboxNote; isDragging?: boolean }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: note.id,
  });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
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
        <span className="material-symbols-outlined text-[16px] text-primary">
          drag_indicator
        </span>
        <p className="truncate font-body text-sm font-medium text-on-surface">
          {note.title || "Untitled"}
        </p>
      </div>
    </div>
  );
}

// ─── Droppable PARA container ─────────────────────────────────────────────────

function DroppableTarget({
  target,
  isOver,
}: {
  target: DropTarget;
  isOver: boolean;
}) {
  const { setNodeRef } = useDroppable({ id: target.id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 text-center transition-all duration-200",
        isOver
          ? `${target.activeColor} border-current scale-105`
          : "border-outline-variant/30 text-on-surface-variant hover:border-outline-variant/60"
      )}
    >
      <span className={cn("material-symbols-outlined text-[24px]", isOver && target.color)}>
        {target.icon}
      </span>
      <p className={cn("font-label text-[11px] font-semibold uppercase tracking-widest", isOver && target.color)}>
        {target.label}
      </p>
    </div>
  );
}

// ─── Main InboxBoard ──────────────────────────────────────────────────────────

export function InboxBoard({
  workspaceId,
  inboxNotes: initialNotes,
  projects,
  areas,
  resources,
}: InboxBoardProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const assignNote = trpc.note.assign.useMutation();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const activeNote = notes.find((n) => n.id === activeNoteId) ?? null;

  // Build drop targets: one per project/area/resource + generic category targets
  const targets: DropTarget[] = [
    ...projects.map((p) => ({
      id: `project:${p.id}`,
      label: p.title,
      icon: "rocket_launch",
      category: "PROJECT" as const,
      color: "text-primary",
      activeColor: "bg-primary-container text-on-primary-container",
    })),
    ...areas.map((a) => ({
      id: `area:${a.id}`,
      label: a.title,
      icon: "hub",
      category: "AREA" as const,
      color: "text-secondary",
      activeColor: "bg-secondary-container text-on-secondary-container",
    })),
    ...resources.map((r) => ({
      id: `resource:${r.id}`,
      label: r.title,
      icon: "book_2",
      category: "RESOURCE" as const,
      color: "text-tertiary",
      activeColor: "bg-tertiary-container text-on-tertiary-container",
    })),
    // Generic archive target always shown
    {
      id: "archive",
      label: "Archive",
      icon: "inventory_2",
      category: "ARCHIVE" as const,
      color: "text-outline",
      activeColor: "bg-surface-container-highest text-on-surface-variant",
    },
  ];

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
    const targetId = over.id as string;
    const target = targets.find((t) => t.id === targetId);
    if (!target) return;

    // Optimistically remove from inbox
    setNotes((prev) => prev.filter((n) => n.id !== noteId));

    const [type, entityId] = targetId.split(":");

    await assignNote.mutateAsync({
      noteId,
      category: target.category,
      projectId: type === "project" ? entityId : undefined,
      areaId: type === "area" ? entityId : undefined,
      resourceId: type === "resource" ? entityId : undefined,
    });
  }

  if (notes.length === 0) return null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver as never}
      onDragEnd={handleDragEnd}
    >
      <section className="rounded-xl bg-surface-container-low p-5">
        {/* Header */}
        <div className="mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
            inbox
          </span>
          <h2 className="font-headline text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
            Inbox
          </h2>
          <span className="ml-auto rounded bg-surface-container px-2 py-0.5 font-label text-[10px] font-semibold text-on-surface-variant">
            {notes.length}
          </span>
        </div>

        <div className="flex gap-4">
          {/* Notes column */}
          <div className="flex w-56 shrink-0 flex-col gap-2">
            {notes.map((note) => (
              <DraggableNote
                key={note.id}
                note={note}
                isDragging={activeNoteId === note.id}
              />
            ))}
            <p className="mt-1 font-label text-[10px] text-on-surface-variant">
              ← drag onto a destination
            </p>
          </div>

          {/* Drop targets */}
          <div className="flex-1 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {targets.map((target) => (
              <DroppableTarget
                key={target.id}
                target={target}
                isOver={overId === target.id}
              />
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
