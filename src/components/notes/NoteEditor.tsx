"use client";

import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";
import { cn } from "@/lib/utils";

interface NoteEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

interface FloatingToolbarState {
  show: boolean;
  top: number;
  left: number;
}

export function NoteEditor({
  content,
  onChange,
  placeholder = "Start writing…",
  className,
}: NoteEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [toolbar, setToolbar] = useState<FloatingToolbarState>({
    show: false,
    top: 0,
    left: 0,
  });

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
      Typography,
    ],
    content,
    editorProps: {
      attributes: {
        class:
          "tiptap prose prose-sm max-w-none focus:outline-none min-h-[400px] font-body text-on-surface",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    onSelectionUpdate: ({ editor }) => {
      const { empty } = editor.state.selection;
      if (empty || !containerRef.current) {
        setToolbar((t) => ({ ...t, show: false }));
        return;
      }
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();
      setToolbar({
        show: true,
        top: rect.top - containerRect.top - 48,
        left: Math.max(
          0,
          rect.left - containerRect.left + rect.width / 2 - 140
        ),
      });
    },
  });

  // Hide toolbar on click outside
  useEffect(() => {
    const hide = () => setToolbar((t) => ({ ...t, show: false }));
    document.addEventListener("mousedown", hide);
    return () => document.removeEventListener("mousedown", hide);
  }, []);

  if (!editor) return null;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Floating formatting toolbar */}
      {toolbar.show && (
        <div
          onMouseDown={(e) => e.preventDefault()}
          style={{ top: toolbar.top, left: toolbar.left }}
          className="absolute z-50 flex items-center gap-0.5 rounded-xl bg-surface-container-lowest px-2 py-1.5 shadow-ambient"
        >
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive("bold")}
            icon="format_bold"
            title="Bold"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive("italic")}
            icon="format_italic"
            title="Italic"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive("strike")}
            icon="strikethrough_s"
            title="Strikethrough"
          />
          <div className="mx-1 h-4 w-px bg-outline-variant" />
          <ToolbarButton
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
            active={editor.isActive("heading", { level: 2 })}
            icon="title"
            title="Heading"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive("bulletList")}
            icon="format_list_bulleted"
            title="Bullet list"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive("orderedList")}
            icon="format_list_numbered"
            title="Numbered list"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive("blockquote")}
            icon="format_quote"
            title="Quote"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCode().run()}
            active={editor.isActive("code")}
            icon="code"
            title="Inline code"
          />
        </div>
      )}

      <EditorContent editor={editor} />
    </div>
  );
}

function ToolbarButton({
  onClick,
  active,
  icon,
  title,
}: {
  onClick: () => void;
  active: boolean;
  icon: string;
  title: string;
}) {
  return (
    <button
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      title={title}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
        active
          ? "bg-primary-container text-on-primary-container"
          : "text-on-surface-variant hover:bg-surface-container"
      )}
    >
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
    </button>
  );
}
