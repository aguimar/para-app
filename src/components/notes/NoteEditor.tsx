"use client";

import { useEffect, useMemo } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import type { Block } from "@blocknote/core";

interface NoteEditorProps {
  content: string;
  onChange: (json: string) => void;
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


export function NoteEditor({ content, onChange }: NoteEditorProps) {
  const initialContent = useMemo(() => parseContent(content), []);

  const editor = useCreateBlockNote({ initialContent });

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
