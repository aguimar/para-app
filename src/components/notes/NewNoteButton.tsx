"use client";

import { useRouter } from "next/navigation";
import { Plus } from "@phosphor-icons/react";

interface NewNoteButtonProps {
  workspaceId: string;
}

export function NewNoteButton({ workspaceId }: NewNoteButtonProps) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push(`/note/new?workspaceId=${workspaceId}`)}
      className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary shadow-ambient transition hover:bg-primary-dim"
    >
      <Plus size={18} />
      New Note
    </button>
  );
}
