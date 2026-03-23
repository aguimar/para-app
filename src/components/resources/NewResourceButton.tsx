"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Plus, X } from "@phosphor-icons/react";
import { Modal } from "@/components/ui/Modal";

export function NewResourceButton({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [areaId, setAreaId] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: areas = [] } = trpc.area.list.useQuery({ workspaceId }, { enabled: open });
  const createResource = trpc.resource.create.useMutation();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await createResource.mutateAsync({
        workspaceId,
        title: title.trim(),
        description: description.trim() || undefined,
        url: url.trim() || undefined,
        areaId: areaId || null,
        tags: [],
      });
      setOpen(false);
      setTitle(""); setDescription(""); setUrl(""); setAreaId("");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-full bg-tertiary px-4 py-2 text-sm font-semibold text-on-tertiary shadow-ambient transition hover:opacity-90"
      >
        <Plus size={18} />
        New Resource
      </button>

      {open && (
        <Modal onClose={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-xl bg-surface-container-lowest shadow-[0_24px_60px_rgba(42,52,57,0.14)]">
            <div className="flex items-center justify-between border-b border-outline-variant/15 px-6 py-4">
              <div>
                <span className="font-label text-[10px] font-semibold uppercase tracking-widest text-tertiary">
                  New Resource
                </span>
                <h2 className="font-headline text-lg font-bold text-on-surface">
                  Adicionar Tópico
                </h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="mb-1.5 block font-label text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant">
                  Título *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="ex: Psicologia, Design, Finanças…"
                  required
                  autoFocus
                  className="w-full rounded-xl bg-surface-container-low px-4 py-2.5 font-body text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-tertiary/20"
                />
              </div>

              <div>
                <label className="mb-1.5 block font-label text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant">
                  Descrição
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Do que trata este tópico?"
                  rows={2}
                  className="w-full resize-none rounded-xl bg-surface-container-low px-4 py-2.5 font-body text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-tertiary/20"
                />
              </div>

              <div>
                <label className="mb-1.5 block font-label text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant">
                  URL <span className="normal-case font-normal opacity-60">(opcional)</span>
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://…"
                  className="w-full rounded-xl bg-surface-container-low px-4 py-2.5 font-body text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-tertiary/20"
                />
              </div>

              {areas.length > 0 && (
                <div>
                  <label className="mb-1.5 block font-label text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant">
                    Área
                  </label>
                  <select
                    value={areaId}
                    onChange={(e) => setAreaId(e.target.value)}
                    className="w-full rounded-xl bg-surface-container-low px-4 py-2.5 font-body text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-tertiary/20"
                  >
                    <option value="">— Nenhuma —</option>
                    {areas.map((a) => (
                      <option key={a.id} value={a.id}>{a.title}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full px-4 py-2 font-label text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || !title.trim()}
                  className="rounded-full bg-tertiary px-5 py-2 font-label text-sm font-semibold text-on-tertiary shadow-ambient transition hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? "Criando…" : "Criar Resource"}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </>
  );
}
