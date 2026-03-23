"use client";

import { trpc } from "@/lib/trpc";

interface Props {
  projectId: string;
  initialProgress: number;
}

export function ProjectProgress({ projectId, initialProgress }: Props) {
  const { data } = trpc.project.byId.useQuery(
    { id: projectId },
    { initialData: undefined, staleTime: Infinity, refetchOnWindowFocus: false }
  );

  const progress = data?.progress ?? initialProgress;

  return (
    <div>
      <p className="font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
        Progress
      </p>
      <div className="mt-1 flex items-center gap-3">
        <div className="w-full h-1.5 rounded-full bg-surface-container-high overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="font-label text-[11px] font-bold text-on-surface tabular-nums">
          {progress}%
        </span>
      </div>
    </div>
  );
}
