"use client";

import { useEffect, useMemo } from "react";
import { useCreateBlockNote, SuggestionMenuController } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import type { Block } from "@blocknote/core";
import dynamic from "next/dynamic";
import { mentionSchema } from "./MentionInlineContent";
import { trpc } from "@/lib/trpc";

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
    // legacy HTML
  }
  return undefined;
}

function NoteEditorInner({ noteId = "", content, onChange }: NoteEditorProps) {
  const initialContent = useMemo(() => parseContent(content) as any, []);
  const utils = trpc.useUtils();

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

  const editor = useCreateBlockNote({ schema: mentionSchema, initialContent, uploadFile });

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
    >
      <SuggestionMenuController
        triggerCharacter="@"
        getItems={async (query) => {
          if (!query) return [];
          try {
            const results = await utils.contacts.search.fetch({ query });
            return results.map((contact) => ({
              title: contact.name,
              subtext: contact.email,
              badge: undefined,
              aliases: [contact.email],
              group: "Contacts",
              icon: contact.photoUrl ? (
                <img
                  src={contact.photoUrl}
                  alt=""
                  style={{ width: 20, height: 20, borderRadius: "50%" }}
                />
              ) : (
                <span
                  style={{
                    display: "inline-flex",
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: "rgba(130,100,255,0.3)",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    color: "#a98eff",
                    fontWeight: 700,
                  }}
                >
                  {contact.name.charAt(0).toUpperCase()}
                </span>
              ),
              onItemClick: () => {
                editor.insertInlineContent([
                  {
                    type: "mention",
                    props: {
                      googleId: contact.googleId,
                      name: contact.name,
                      email: contact.email,
                      photoUrl: contact.photoUrl ?? "",
                    },
                  },
                  " ",
                ]);
              },
            }));
          } catch {
            return [];
          }
        }}
      />
    </BlockNoteView>
  );
}

export const NoteEditor = dynamic(
  () => Promise.resolve(NoteEditorInner),
  { ssr: false }
);
