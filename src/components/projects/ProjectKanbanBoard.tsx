"use client";

import { useState } from "react";
import { DndContext, DragEndEvent, closestCorners, DragStartEvent, DragOverlay } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { NoteCard } from "@/components/ui/NoteCard";
import type { Note } from "@/generated/prisma/client";
import { type ParaCategory } from "@/types";
import { trpc } from "@/lib/trpc";

type KanbanColumn = "TODO" | "IN_PROGRESS" | "DONE";

const COLUMNS: { id: KanbanColumn; title: string; color: string }[] = [
  { id: "TODO", title: "Inbox / Captação", color: "bg-outline/10 text-outline" },
  { id: "IN_PROGRESS", title: "Em Progresso", color: "bg-primary-container/50 text-primary" },
  { id: "DONE", title: "Integrado / Arquivo", color: "bg-secondary-container/50 text-secondary" },
];

function SortableNoteItem({ note }: { note: Note }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: note.id,
    data: { type: "NOTE", note },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
      <div className="pointer-events-none">
        <NoteCard
          id={note.id}
          title={note.title}
          icon={(note as any).icon}
          body={note.body}
          category={note.category as ParaCategory}
          updatedAt={note.updatedAt}
          tags={note.tags}
        />
      </div>
    </div>
  );
}

export function ProjectKanbanBoard({ initialNotes }: { initialNotes: Note[] }) {
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [activeId, setActiveId] = useState<string | null>(null);
  
  const updateNoteMutation = trpc.note.update.useMutation();

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;

    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveTask = active.data.current?.type === "NOTE";
    const isOverColumn = over.data.current?.type === "COLUMN";
    const isOverTask = over.data.current?.type === "NOTE";

    if (!isActiveTask) return;

    // Moving NOTE to another Column
    if (isOverColumn) {
      const newStatus = overId as KanbanColumn;
      setNotes((prev) =>
        prev.map((n) => (n.id === activeId ? { ...n, status: newStatus as any } : n))
      );
      updateNoteMutation.mutate({ id: activeId as string, status: newStatus });
      return;
    }

    // Moving NOTE over another NOTE
    if (isOverTask) {
      const overStatus = over.data.current?.note.status;
      setNotes((prev) =>
        prev.map((n) => (n.id === activeId ? { ...n, status: overStatus } : n))
      );
      updateNoteMutation.mutate({ id: activeId as string, status: overStatus });
      return;
    }
  };

  const activeNote = notes.find((n) => n.id === activeId);

  return (
    <DndContext collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {COLUMNS.map((col) => {
          const columnNotes = notes.filter((n) => (n as any).status === col.id || (!("status" in n) && col.id === "TODO"));
          return (
            <DroppableColumn key={col.id} id={col.id} title={col.title} color={col.color}>
              <SortableContext items={columnNotes.map((n) => n.id)} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-3 min-h-[150px]">
                  {columnNotes.map((note) => (
                    <SortableNoteItem key={note.id} note={note} />
                  ))}
                </div>
              </SortableContext>
            </DroppableColumn>
          );
        })}
      </div>

      <DragOverlay>
        {activeNote ? (
          <div className="opacity-90 scale-105 shadow-xl rotate-2">
            <NoteCard
              id={activeNote.id}
              title={activeNote.title}
              icon={(activeNote as any).icon}
              body={activeNote.body}
              category={activeNote.category as ParaCategory}
              updatedAt={activeNote.updatedAt}
              tags={activeNote.tags}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function DroppableColumn({ id, title, color, children }: { id: string; title: string; color: string; children: React.ReactNode }) {
  const { setNodeRef } = useSortable({
    id: id,
    data: { type: "COLUMN" },
  });

  return (
    <div ref={setNodeRef} className="flex-1 min-w-[300px] flex flex-col gap-4 bg-surface-container-low p-4 rounded-xl border border-outline-variant/20">
      <div className={`px-3 py-1.5 rounded-md font-bold text-xs uppercase tracking-widest inline-block self-start ${color}`}>
        {title}
      </div>
      {children}
    </div>
  );
}
