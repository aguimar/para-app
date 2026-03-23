"use client";

import { useEffect, useMemo } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import type { Block } from "@blocknote/core";
import dynamic from "next/dynamic";

interface NoteEditorProps {
  noteId?: string;
  content: string;
  onChange: (json: string) => void;
  placeholder?: string;
}

function parseContent(raw: string): Block[] | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as Block[];
  } catch {
    // legacy HTML — will be imported async below
  }
  return undefined;
}

function NoteEditorInner({ noteId = "", content, onChange }: NoteEditorProps) {
  const initialContent = useMemo(() => parseContent(content), []);

  const uploadFile = useMemo(
    () => async (file: File): Promise<string> => {
      const form = new FormData();
      form.append("file", file);
      form.append("noteId", noteId);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      return `/api/files/${data.id}`;
    },
    [noteId]
  );

  const editor = useCreateBlockNote({ initialContent, uploadFile });

  // Import legacy HTML content on first mount
  useEffect(() => {
    if (!content || parseContent(content)) return;
    editor.tryParseHTMLToBlocks(content).then((blocks) => {
      editor.replaceBlocks(editor.document, blocks);
    });
  }, []);

  return (
    <BlockNoteView
      editor={editor}
      theme="light"
      onChange={() => onChange(JSON.stringify(editor.document))}
    />
  );
}

export const NoteEditor = dynamic(
  () => Promise.resolve(NoteEditorInner),
  { ssr: false }
);
