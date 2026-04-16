import { NoteCard } from "@/components/ui/NoteCard";
import type { ParaCategory } from "@/types";

interface GroupNote {
  id: string;
  title: string;
  icon: string;
  body: string;
  category: string;
  updatedAt: Date | string;
  tags: string[];
}

interface NoteGroupItem {
  id: string;
  title: string;
  notes: GroupNote[];
}

interface NoteGroupListProps {
  title: string;
  groups: NoteGroupItem[];
}

export function NoteGroupList({ title, groups }: NoteGroupListProps) {
  if (groups.length === 0) return null;

  return (
    <section>
      <div className="mb-4 flex items-center gap-3">
        <span className="font-label text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">
          {title}
        </span>
        <span className="rounded bg-surface-container-high px-2 py-0.5 font-label text-[10px] font-bold text-on-surface-variant">
          {groups.length}
        </span>
      </div>

      <div className="space-y-4">
        {groups.map((group) => (
          <div
            key={group.id}
            className="rounded-2xl bg-surface-container-low p-4 shadow-ambient"
          >
            <div className="mb-3 flex items-center gap-3">
              <h3 className="font-headline text-base font-semibold text-on-surface">
                {group.title}
              </h3>
              <span className="rounded bg-surface-container-high px-2 py-0.5 font-label text-[10px] font-bold text-on-surface-variant">
                {group.notes.length}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.notes.map((note) => (
                <NoteCard
                  key={note.id}
                  id={note.id}
                  title={note.title}
                  icon={note.icon}
                  body={note.body}
                  category={note.category as ParaCategory}
                  updatedAt={note.updatedAt}
                  tags={note.tags}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
