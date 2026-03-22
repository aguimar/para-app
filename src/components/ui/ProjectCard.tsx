import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import { type ProjectStatus } from "@/types";

const STATUS_STYLES: Record<ProjectStatus, { dot: string; label: string }> = {
  ACTIVE: { dot: "bg-primary", label: "Active" },
  ON_HOLD: { dot: "bg-tertiary", label: "On Hold" },
  COMPLETED: { dot: "bg-secondary", label: "Completed" },
};

interface ProjectCardProps {
  id: string;
  workspaceSlug: string;
  title: string;
  description?: string | null;
  status: ProjectStatus;
  progress: number;
  deadline?: Date | string | null;
  noteCount?: number;
  className?: string;
}

export function ProjectCard({
  id,
  workspaceSlug,
  title,
  description,
  status,
  progress,
  deadline,
  noteCount,
  className,
}: ProjectCardProps) {
  const { dot, label } = STATUS_STYLES[status];

  return (
    <Link
      href={`/${workspaceSlug}/projects/${id}`}
      className={cn(
        "group block rounded-xl bg-surface-container-lowest p-5 shadow-ambient transition-shadow hover:shadow-[0_16px_48px_rgba(42,52,57,0.10)]",
        className
      )}
    >
      {/* Status indicator */}
      <div className="flex items-center gap-2">
        <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
        <span className="font-label text-[11px] uppercase tracking-widest text-on-surface-variant">
          {label}
        </span>
      </div>

      <h3 className="mt-2 font-headline text-base font-semibold text-on-surface group-hover:text-primary transition-colors line-clamp-2">
        {title}
      </h3>

      {description && (
        <p className="mt-1.5 font-body text-sm text-on-surface-variant line-clamp-2">
          {description}
        </p>
      )}

      {/* Progress bar */}
      <div className="mt-4">
        <div className="flex justify-between">
          <span className="font-label text-[11px] uppercase tracking-widest text-on-surface-variant">
            Progress
          </span>
          <span className="font-label text-[11px] text-on-surface-variant">
            {progress}%
          </span>
        </div>
        <div className="mt-1.5 h-1 rounded-full bg-surface-container-highest overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between text-[11px] font-label uppercase tracking-widest text-on-surface-variant">
        {deadline && <span>Due {formatDate(deadline)}</span>}
        {noteCount !== undefined && (
          <span className="ml-auto">
            {noteCount} {noteCount === 1 ? "note" : "notes"}
          </span>
        )}
      </div>
    </Link>
  );
}
