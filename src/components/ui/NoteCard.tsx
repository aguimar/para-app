import Link from "next/link";
import { cn, formatRelativeDate, bodyToPlainText } from "@/lib/utils";
import { ParaBadge } from "./ParaBadge";
import { PickedIcon } from "./PickedIcon";
import { type ParaCategory } from "@/types";

interface NoteCardProps {
  id: string;
  title: string;
  icon?: string;
  body?: string;
  category: ParaCategory;
  updatedAt: Date | string;
  tags?: string[];
  className?: string;
}

export function NoteCard({
  id,
  title,
  icon,
  body,
  category,
  updatedAt,
  tags,
  className,
}: NoteCardProps) {
  const preview = body ? bodyToPlainText(body).slice(0, 120) : undefined;

  return (
    <Link
      href={`/note/${id}`}
      className={cn(
        "group block rounded-xl bg-surface-container-lowest p-5 shadow-ambient transition-shadow hover:shadow-[0_16px_48px_rgba(42,52,57,0.10)]",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {icon && <PickedIcon name={icon} size={18} className="shrink-0 text-on-surface-variant" />}
          <h3 className="font-headline text-base font-semibold text-on-surface group-hover:text-primary transition-colors line-clamp-2">
            {title || "Untitled"}
          </h3>
        </div>
        <ParaBadge category={category} className="shrink-0" />
      </div>
      {preview && (
        <p className="mt-2 font-body text-sm text-on-surface-variant line-clamp-3">
          {preview}
        </p>
      )}
      <div className="mt-4 flex items-center gap-3">
        <span className="font-label text-[11px] uppercase tracking-widest text-on-surface-variant">
          {formatRelativeDate(updatedAt)}
        </span>
        {tags && tags.length > 0 && (
          <div className="flex gap-1">
            {tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded bg-surface-container px-1.5 py-0.5 font-label text-[10px] text-on-surface-variant"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
