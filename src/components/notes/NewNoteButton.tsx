"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { trpc } from "@/lib/trpc";

interface NewNoteButtonProps {
  workspaceId: string;
}

export function NewNoteButton({ workspaceId }: NewNoteButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const createNote = trpc.note.create.useMutation();

  async function handleClick() {
    setLoading(true);
    try {
      console.log("[NewNote] creating note for workspace:", workspaceId);
      const note = await createNote.mutateAsync({
        workspaceId,
        title: "Untitled",
        body: "",
        category: "INBOX",
      });
      console.log("[NewNote] created:", note.id);
      router.push(`/note/${note.id}`);
    } catch (err) {
      console.error("[NewNote] error:", err);
      alert("Failed to create note: " + String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary shadow-ambient transition hover:bg-primary-dim disabled:opacity-60"
    >
      <span className="material-symbols-outlined text-[18px]">add</span>
      {loading ? "Creating…" : "New Note"}
    </button>
  );
}
