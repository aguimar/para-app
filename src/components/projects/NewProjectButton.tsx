"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Plus, X } from "@phosphor-icons/react";

interface NewProjectButtonProps {
  workspaceId: string;
  variant?: "sidebar" | "card";
}

const PRIORITIES = [
  { value: "HIGH", label: "High", color: "bg-error-container text-on-error-container" },
  { value: "MEDIUM", label: "Medium", color: "bg-secondary-container text-on-secondary-container" },
  { value: "LOW", label: "Low", color: "bg-surface-container-highest text-on-surface-variant" },
] as const;

export function NewProjectButton({ workspaceId, variant = "sidebar" }: NewProjectButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"HIGH" | "MEDIUM" | "LOW">("MEDIUM");
  const [deadline, setDeadline] = useState("");
  const [areaId, setAreaId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const { data: areas = [] } = trpc.area.list.useQuery({ workspaceId }, { enabled: open });
  const createProject = trpc.project.create.useMutation();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const project = await createProject.mutateAsync({
        workspaceId,
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        deadline: deadline ? new Date(deadline) : undefined,
        status: "ACTIVE",
        areaId: areaId || null,
      });
      setOpen(false);
      resetForm();
      router.refresh();
      router.push(window.location.pathname.split("/projects")[0] + `/projects/${project.id}`);
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setTitle("");
    setDescription("");
    setPriority("MEDIUM");
    setDeadline("");
    setAreaId("");
  }

  return (
    <>
      {variant === "sidebar" ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary shadow-ambient transition hover:bg-primary-dim"
        >
          <Plus size={18} />
          New Project
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex min-h-[220px] w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-outline-variant/30 p-6 transition-colors hover:bg-surface-container-low/50 group"
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant transition-all group-hover:bg-primary group-hover:text-on-primary">
            <Plus size={24} />
          </div>
          <p className="font-headline font-bold text-on-surface-variant">Initiate New Project</p>
        </button>
      )}

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-inverse-surface/20 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Dialog */}
          <div className="relative w-full max-w-lg rounded-xl bg-surface-container-lowest shadow-[0_24px_60px_rgba(42,52,57,0.14)]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-outline-variant/15 px-6 py-4">
              <div>
                <span className="font-label text-[10px] font-semibold uppercase tracking-widest text-primary">
                  New Project
                </span>
                <h2 className="font-headline text-lg font-bold text-on-surface">
                  Initiate a Project
                </h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Title */}
              <div>
                <label className="mb-1.5 block font-label text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant">
                  Project Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Q4 Brand Redesign"
                  required
                  autoFocus
                  className="w-full rounded-xl bg-surface-container-low px-4 py-2.5 font-body text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Description */}
              <div>
                <label className="mb-1.5 block font-label text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is the outcome of this project?"
                  rows={3}
                  className="w-full resize-none rounded-xl bg-surface-container-low px-4 py-2.5 font-body text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Area */}
              {areas.length > 0 && (
                <div>
                  <label className="mb-1.5 block font-label text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant">
                    Area
                  </label>
                  <select
                    value={areaId}
                    onChange={(e) => setAreaId(e.target.value)}
                    className="w-full rounded-xl bg-surface-container-low px-4 py-2.5 font-body text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">— No area —</option>
                    {areas.map((a) => (
                      <option key={a.id} value={a.id}>{a.title}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* Priority */}
                <div>
                  <label className="mb-1.5 block font-label text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant">
                    Priority
                  </label>
                  <div className="flex gap-1.5">
                    {PRIORITIES.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setPriority(p.value)}
                        className={cn(
                          "flex-1 rounded px-2 py-1.5 font-label text-[10px] font-bold uppercase tracking-wide transition-opacity",
                          p.color,
                          priority !== p.value && "opacity-30"
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Deadline */}
                <div>
                  <label className="mb-1.5 block font-label text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant">
                    Deadline
                  </label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full rounded-xl bg-surface-container-low px-3 py-2.5 font-body text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full px-4 py-2 font-label text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !title.trim()}
                  className="rounded-full bg-primary px-5 py-2 font-label text-sm font-semibold text-on-primary shadow-ambient transition hover:bg-primary-dim disabled:opacity-50"
                >
                  {saving ? "Creating…" : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
