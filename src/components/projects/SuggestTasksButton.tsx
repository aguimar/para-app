"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Sparkle, X, Check } from "@/components/ui/icons";
import { Modal } from "@/components/ui/Modal";

interface Props {
  projectId: string;
  workspaceId: string;
}

export function SuggestTasksButton({ projectId, workspaceId }: Props) {
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<{ title: string }[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [creating, setCreating] = useState(false);
  const [done, setDone] = useState(false);

  const suggestMutation = trpc.project.suggestTasks.useMutation({
    onSuccess: (data) => {
      setSuggestions(data);
      setSelected(new Set(data.map((_, i) => i)));
      setDone(false);
    },
  });

  const router = useRouter();
  const createNote = trpc.note.create.useMutation();

  function toggle(i: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  async function handleCreate() {
    setCreating(true);
    const toCreate = suggestions.filter((_, i) => selected.has(i));
    await Promise.all(
      toCreate.map((s) =>
        createNote.mutateAsync({
          workspaceId,
          title: s.title,
          category: "PROJECT",
          tags: [],
          projectId,
        })
      )
    );
    setCreating(false);
    setDone(true);
    setTimeout(() => { setOpen(false); router.refresh(); }, 1200);
  }

  function handleOpen() {
    setOpen(true);
    setSuggestions([]);
    setSelected(new Set());
    setDone(false);
    suggestMutation.mutate({ id: projectId });
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="inline-flex items-center gap-2 rounded-xl bg-tertiary-container/60 px-4 py-2 font-label text-xs font-bold uppercase tracking-widest text-tertiary hover:bg-tertiary-container transition-colors"
      >
        <Sparkle size={14} weight="fill" />
        Sugerir tarefas
      </button>

      {open && (
        <Modal onClose={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-surface-container-low shadow-[0_24px_64px_rgba(0,0,0,0.25)] flex flex-col" style={{ maxHeight: "min(85vh, 640px)" }}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-outline-variant/10">
              <div className="flex items-center gap-2">
                <Sparkle size={16} weight="fill" className="text-tertiary" />
                <span className="font-headline text-sm font-bold text-on-surface">
                  Tarefas sugeridas
                </span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {suggestMutation.isPending && (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <div className="w-6 h-6 rounded-full border-2 border-tertiary border-t-transparent animate-spin" />
                  <p className="font-body text-sm text-on-surface-variant">
                    Pensando nas melhores tarefas…
                  </p>
                </div>
              )}

              {suggestMutation.isError && (
                <p className="text-center font-body text-sm text-error py-8">
                  Erro ao gerar sugestões. Tente novamente.
                </p>
              )}

              {suggestions.length > 0 && (
                <ul className="flex flex-col gap-2">
                  {suggestions.map((s, i) => (
                    <li key={i}>
                      <button
                        onClick={() => toggle(i)}
                        className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors ${
                          selected.has(i)
                            ? "bg-tertiary-container/40 text-on-surface"
                            : "bg-surface-container text-on-surface-variant"
                        }`}
                      >
                        <span
                          className={`flex-shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                            selected.has(i)
                              ? "bg-tertiary border-tertiary"
                              : "border-outline-variant"
                          }`}
                        >
                          {selected.has(i) && <Check size={12} weight="bold" className="text-on-tertiary" />}
                        </span>
                        <span className="font-body text-sm">{s.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Footer */}
            {suggestions.length > 0 && (
              <div className="px-6 py-4 border-t border-outline-variant/10 flex items-center justify-between gap-4">
                <span className="font-label text-xs text-on-surface-variant">
                  {selected.size} de {suggestions.length} selecionadas
                </span>
                <button
                  onClick={handleCreate}
                  disabled={selected.size === 0 || creating || done}
                  className="inline-flex items-center gap-2 rounded-xl bg-tertiary px-5 py-2.5 font-label text-xs font-bold uppercase tracking-widest text-on-tertiary hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {done ? (
                    <><Check size={13} weight="bold" /> Criadas!</>
                  ) : creating ? (
                    "Criando…"
                  ) : (
                    "Criar selecionadas"
                  )}
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
