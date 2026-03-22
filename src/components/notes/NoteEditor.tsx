"use client";

import { useEffect, useMemo } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import type { Block, Theme } from "@blocknote/core";

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

// Theme tokens matching the app's dark palette (globals.css .dark)
const paraTheme: Theme = {
  colors: {
    editor: {
      text: "#dce4e9",       // --color-on-surface dark
      background: "#09100f", // --color-surface-container-lowest dark
      selectedText: "#618bff",
    },
    menu: {
      text: "#dce4e9",
      background: "#1b272c", // --color-surface-container dark
    },
    tooltip: {
      text: "#bdc8cf",
      background: "#253136", // --color-surface-container-high dark
    },
    hovered: {
      text: "#dce4e9",
      background: "#253136",
    },
    selected: {
      text: "#dbe1ff",
      background: "#003798", // --color-primary-container dark
    },
    disabled: {
      text: "#566166",       // --color-on-surface-variant light
      background: "#1b272c",
    },
    shadow: "rgba(0, 0, 0, 0.32)",
    border: "#3d484e",       // --color-outline-variant dark
    sideMenu: "#3d484e",
    highlights: {
      gray: { text: "#bdc8cf", background: "#253136" },
      brown: { text: "#ffddb3", background: "#5a3a00" },
      red: { text: "#fe8983", background: "#4e0309" },
      orange: { text: "#ffb945", background: "#5a3a00" },
      yellow: { text: "#f8a010", background: "#4a2c00" },
      green: { text: "#4fdba0", background: "#005236" },
      blue: { text: "#618bff", background: "#003798" },
      purple: { text: "#c4b5fd", background: "#3b2a6e" },
      pink: { text: "#f9a8d4", background: "#6b2147" },
    },
  },
  borderRadius: 6,
  fontFamily: "Inter, sans-serif",
};

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
      theme={paraTheme}
      onChange={() => onChange(JSON.stringify(editor.document))}
    />
  );
}
