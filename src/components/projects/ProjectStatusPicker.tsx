"use client";

import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { type ProjectStatus } from "@/types";

const STATUS_LABELS: Record<ProjectStatus, string> = {
  ACTIVE: "Active",
  ON_HOLD: "On Hold",
  COMPLETED: "Completed",
};

const STATUS_BADGE: Record<ProjectStatus, string> = {
  ACTIVE:    "bg-primary-container text-on-primary-container",
  ON_HOLD:   "bg-tertiary-container text-on-tertiary-container",
  COMPLETED: "bg-surface-container-high text-on-surface-variant",
};

interface Props {
  projectId: string;
  currentStatus: ProjectStatus;
}

export function ProjectStatusPicker({ projectId, currentStatus }: Props) {
  const router = useRouter();
  const update = trpc.project.update.useMutation({ onSuccess: () => router.refresh() });

  return (
    <select
      value={currentStatus}
      disabled={update.isPending}
      onChange={(e) =>
        update.mutate({ id: projectId, status: e.target.value as ProjectStatus })
      }
      className={`mt-1.5 rounded-md px-2 py-0.5 font-label text-[11px] font-bold cursor-pointer border-none outline-none appearance-none transition-opacity ${STATUS_BADGE[currentStatus]} ${update.isPending ? "opacity-50" : ""}`}
    >
      {(Object.keys(STATUS_LABELS) as ProjectStatus[]).map((s) => (
        <option key={s} value={s}>
          {STATUS_LABELS[s]}
        </option>
      ))}
    </select>
  );
}
