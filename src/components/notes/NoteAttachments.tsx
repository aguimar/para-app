"use client";

import { useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  Paperclip, FilePdf, FileText, Image, File,
  Trash, ArrowSquareOut, CircleNotch, UploadSimple, X,
} from "@phosphor-icons/react";

interface Props {
  noteId: string;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType === "application/pdf") return <FilePdf size={18} className="text-red-500" />;
  if (mimeType.startsWith("image/")) return <Image size={18} className="text-blue-500" />;
  if (mimeType.startsWith("text/")) return <FileText size={18} className="text-on-surface-variant" />;
  return <File size={18} className="text-on-surface-variant" />;
}

interface ViewerState {
  id: string;
  filename: string;
  mimeType: string;
}

export function NoteAttachments({ noteId }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewer, setViewer] = useState<ViewerState | null>(null);

  const utils = trpc.useUtils();
  const { data: attachments = [] } = trpc.attachment.list.useQuery({ noteId });
  const deleteAttachment = trpc.attachment.delete.useMutation({
    onSuccess: () => utils.attachment.list.invalidate({ noteId }),
  });

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("noteId", noteId);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Upload failed");
      }
      utils.attachment.list.invalidate({ noteId });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="border-t border-outline-variant/15 pt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <Paperclip size={14} className="text-on-surface-variant" />
          <p className="font-label text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant">
            Attachments
          </p>
          {attachments.length > 0 && (
            <span className="rounded bg-surface-container px-1.5 py-0.5 font-label text-[10px] font-semibold text-on-surface-variant">
              {attachments.length}
            </span>
          )}
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={cn(
            "flex items-center gap-1 rounded-md px-2 py-1 font-label text-[10px] font-bold uppercase tracking-wider transition-all",
            uploading
              ? "text-on-surface-variant opacity-50"
              : "text-primary hover:bg-primary-container/40"
          )}
        >
          {uploading ? <CircleNotch size={12} className="animate-spin" /> : <UploadSimple size={12} />}
          {uploading ? "Uploading…" : "Attach"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.txt,.md"
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      {error && (
        <p className="mb-2 rounded-lg bg-error-container px-3 py-2 font-body text-xs text-on-error-container">
          {error}
        </p>
      )}

      {attachments.length === 0 && !uploading && (
        <p className="font-body text-xs text-on-surface-variant">No attachments yet.</p>
      )}

      <div className="space-y-1.5">
        {attachments.map((att) => (
          <div
            key={att.id}
            className="flex items-center gap-2.5 rounded-lg bg-surface-container px-3 py-2"
          >
            <button
              onClick={() => setViewer({ id: att.id, filename: att.filename, mimeType: att.mimeType })}
              className="shrink-0"
              title="Preview"
            >
              <FileIcon mimeType={att.mimeType} />
            </button>
            <button
              onClick={() => setViewer({ id: att.id, filename: att.filename, mimeType: att.mimeType })}
              className="flex-1 min-w-0 text-left"
            >
              <p className="truncate font-body text-xs font-medium text-on-surface hover:text-primary transition-colors">
                {att.filename}
              </p>
              <p className="font-label text-[10px] text-on-surface-variant">
                {formatSize(att.size)}
              </p>
            </button>
            <a
              href={`/api/files/${att.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-on-surface-variant hover:text-on-surface transition-colors"
              title="Open in new tab"
            >
              <ArrowSquareOut size={14} />
            </a>
            <button
              onClick={() => deleteAttachment.mutate({ id: att.id })}
              className="shrink-0 text-on-surface-variant hover:text-error transition-colors"
              title="Delete"
            >
              <Trash size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* PDF / file viewer modal */}
      {viewer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setViewer(null)}
        >
          <div
            className="relative flex h-[90vh] w-[90vw] max-w-5xl flex-col rounded-2xl bg-surface-container-lowest shadow-[0_32px_80px_rgba(0,0,0,0.3)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex shrink-0 items-center gap-3 border-b border-outline-variant/20 px-5 py-3">
              <FileIcon mimeType={viewer.mimeType} />
              <p className="flex-1 truncate font-body text-sm font-medium text-on-surface">
                {viewer.filename}
              </p>
              <a
                href={`/api/files/${viewer.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-on-surface-variant hover:text-on-surface transition-colors"
                title="Open in new tab"
              >
                <ArrowSquareOut size={16} />
              </a>
              <button
                onClick={() => setViewer(null)}
                className="text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Viewer content */}
            <div className="flex-1 overflow-hidden rounded-b-2xl">
              {viewer.mimeType.startsWith("image/") ? (
                <div className="flex h-full items-center justify-center bg-surface-container p-6">
                  <img
                    src={`/api/files/${viewer.id}`}
                    alt={viewer.filename}
                    className="max-h-full max-w-full rounded-lg object-contain shadow-ambient"
                  />
                </div>
              ) : (
                <embed
                  src={`/api/files/${viewer.id}`}
                  type={viewer.mimeType}
                  className="h-full w-full rounded-b-2xl"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
