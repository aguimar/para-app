import { cn } from "@/lib/utils";
import { type ParaCategory, PARA_LABELS } from "@/types";

const BADGE_STYLES: Record<ParaCategory, string> = {
  INBOX: "bg-surface-container text-on-surface-variant",
  PROJECT: "bg-primary-container text-on-primary-container",
  AREA: "bg-secondary-container text-on-secondary-container",
  RESOURCE: "bg-tertiary-container text-on-tertiary-container",
  ARCHIVE: "bg-surface-container-highest text-on-surface-variant",
};

interface ParaBadgeProps {
  category: ParaCategory;
  className?: string;
}

export function ParaBadge({ category, className }: ParaBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2 py-0.5 font-label text-[11px] font-semibold uppercase tracking-wide",
        BADGE_STYLES[category],
        className
      )}
    >
      {PARA_LABELS[category]}
    </span>
  );
}
