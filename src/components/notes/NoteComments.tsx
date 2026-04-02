"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Trash, PaperPlaneTilt, CircleNotch } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

type Props = { noteId: string };

export function NoteComments({ noteId }: Props) {
  const utils = trpc.useUtils();
  const { data: comments = [], isLoading } = trpc.comment.list.useQuery({ noteId });
  const create = trpc.comment.create.useMutation({
    onSuccess: () => {
      utils.comment.list.invalidate({ noteId });
      setBody("");
    },
  });
  const remove = trpc.comment.delete.useMutation({
    onSuccess: () => utils.comment.list.invalidate({ noteId }),
  });

  const [body, setBody] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    create.mutate({ noteId, body: trimmed });
  }

  return (
    <div className="space-y-3">
      <p className="font-label text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant">
        Comentários
      </p>

      {isLoading ? (
        <CircleNotch size={14} className="animate-spin text-on-surface-variant" />
      ) : comments.length === 0 ? (
        <p className="font-body text-xs text-on-surface-variant">Nenhum comentário ainda.</p>
      ) : (
        <ul className="space-y-2">
          {comments.map((c) => (
            <li
              key={c.id}
              className="group relative rounded-xl bg-surface-container p-3"
            >
              <p className="font-body text-sm text-on-surface whitespace-pre-wrap leading-snug">
                {c.body}
              </p>
              <div className="mt-1.5 flex items-center justify-between">
                <span className="font-label text-[10px] text-on-surface-variant/60">
                  {new Date(c.createdAt).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <button
                  onClick={() => remove.mutate({ id: c.id })}
                  disabled={remove.isPending}
                  className="opacity-0 group-hover:opacity-100 flex items-center justify-center text-on-surface-variant hover:text-error transition-all"
                  title="Remover comentário"
                >
                  <Trash size={13} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Adicionar comentário…"
          rows={2}
          className="flex-1 resize-none rounded-xl bg-surface-container px-3 py-2 font-body text-sm text-on-surface placeholder:text-on-surface-variant/50 outline-none focus:ring-2 focus:ring-primary/20 transition-shadow"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit(e as any);
          }}
        />
        <button
          type="submit"
          disabled={!body.trim() || create.isPending}
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-on-primary transition-opacity self-end",
            (!body.trim() || create.isPending) && "opacity-40"
          )}
          title="Enviar (Ctrl+Enter)"
        >
          {create.isPending ? (
            <CircleNotch size={14} className="animate-spin" />
          ) : (
            <PaperPlaneTilt size={14} />
          )}
        </button>
      </form>
    </div>
  );
}
