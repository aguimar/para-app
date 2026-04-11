"use client";

import { useEffect, useMemo } from "react";
import { useCreateBlockNote, SuggestionMenuController } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import type { Block, PartialBlock } from "@blocknote/core";
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
  const initialContent = useMemo(
    () => parseContent(content) as PartialBlock<any, any, any>[] | undefined,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
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

  // Run once on mount only — re-seeding on content change would overwrite user edits.
  // editor is a stable ref from useCreateBlockNote so omitting it is safe.
  useEffect(() => {
    if (!content || parseContent(content)) return;
    editor.tryParseHTMLToBlocks(content).then((blocks) => {
      editor.replaceBlocks(editor.document, blocks);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-purple-500/30 text-[10px] font-bold text-purple-400">
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
          } catch (error) {
            console.error("[mention] contact search failed:", error);
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
