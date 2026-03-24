"use client";

import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { type ProjectStatus } from "@/types";
import { useTranslation } from "@/lib/i18n-client";

const STATUS_DICT_KEY: Record<ProjectStatus, "active" | "onHold" | "completed"> = {
  ACTIVE: "active",
  ON_HOLD: "onHold",
  COMPLETED: "completed",
};

const STATUS_BADGE: Record<ProjectStatus, string> = {
  ACTIVE:    "bg-primary-container text-on-primary-container",
  ON_HOLD:   "bg-tertiary-container text-on-tertiary-container",
  COMPLETED: "bg-surface-container-high text-on-surface-variant",
};

const STATUSES: ProjectStatus[] = ["ACTIVE", "ON_HOLD", "COMPLETED"];

interface Props {
  projectId: string;
  currentStatus: ProjectStatus;
}

export function ProjectStatusPicker({ projectId, currentStatus }: Props) {
  const router = useRouter();
  const t = useTranslation();
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
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {t.projectStatus[STATUS_DICT_KEY[s]]}
        </option>
      ))}
    </select>
  );
}
