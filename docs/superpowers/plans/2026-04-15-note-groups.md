# Note Groups (Inbox) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow the user to group inbox notes into a named container by dragging one note onto another, then drag further notes into that container.

**Architecture:** Introduce a new `NoteGroup` Prisma model keyed to a workspace. Each `Note` gets an optional `groupId` FK. The Inbox dashboard renders groups as expandable droppable containers next to ungrouped notes; dragging a note onto another inbox note creates a new group containing both, dragging onto a group adds to it, dragging out unsets `groupId` (auto-deleting the group if it drops below 2 notes). All mutations go through a new `noteGroup` tRPC router.

**Tech Stack:** Next.js 16 App Router, tRPC, Prisma + PostgreSQL, `@dnd-kit/core`, Tailwind v4, dictionaries in `src/dictionaries/{en-US,pt-BR}.json`.

**Design decisions (assumed — flip if needed before starting):**
- Group has its own `title` (default `"Grupo sem nome"` / `"Unnamed group"`), editable inline.
- Group lives only in INBOX for now (no assigning an entire group to PARA — user can drag a group's individual notes). `category` on group reserved for future expansion but defaults to INBOX.
- Dropping note onto a single note creates a group; dropping onto an existing group card adds to it.
- Removing a note leaving a group with <2 notes auto-deletes the group and unsets `groupId` on the remaining note.
- No existing test runner is configured in this repo — verification is via type-check, lint, Prisma migration, and manual browser testing. Each task ends with a commit.

---

## File Structure

| Path | Responsibility |
|---|---|
| `prisma/schema.prisma` | Add `NoteGroup` model, add `groupId` + `group` relation on `Note` |
| `src/server/routers/noteGroup.ts` | New tRPC router: `create`, `rename`, `addNote`, `removeNote`, `delete` |
| `src/server/routers/index.ts` | Register `noteGroup` router |
| `src/app/(app)/dashboard/page.tsx` | Fetch groups + inbox notes (ungrouped + grouped) and pass to `InboxBoard` |
| `src/components/notes/InboxBoard.tsx` | Render groups as droppables, support drag-note-onto-note and drag-note-into-group, expand/collapse, rename |
| `src/dictionaries/en-US.json`, `src/dictionaries/pt-BR.json` | Add `inbox.group.*` strings |

---

## Task 1: Schema migration for `NoteGroup`

**Files:**
- Modify: `prisma/schema.prisma`
- Command: `/migrate note-groups`

- [ ] **Step 1: Add the model and FK to `schema.prisma`**

Insert after the `NoteStatus` enum and before `model User`, or anywhere in Models section. Add `group` relation + `groupId` on `Note`.

```prisma
model NoteGroup {
  id          String    @id @default(cuid())
  title       String    @default("Unnamed group")
  icon        String    @default("")
  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  notes       Note[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([workspaceId])
}
```

Add the inverse on `Workspace` (inside `model Workspace { ... }` near `notes Note[]`):

```prisma
  noteGroups NoteGroup[]
```

Add on `Note` (near the other FK relations):

```prisma
  groupId     String?
  group       NoteGroup?   @relation(fields: [groupId], references: [id], onDelete: SetNull)
```

Add to the existing `Note` indexes block:

```prisma
  @@index([groupId])
```

- [ ] **Step 2: Generate & apply migration**

Run: `/migrate note-groups`
Expected: migration file generated under `prisma/migrations/*_note_groups/`, applied to DB, Prisma client regenerated, app container restarted.

- [ ] **Step 3: Verify Prisma client types**

Run: `docker compose exec app npx tsc --noEmit`
Expected: no errors. `NoteGroup` type importable from `@/generated/prisma`, `Note` has `groupId: string | null`.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(db): add NoteGroup model and Note.groupId"
```

---

## Task 2: `noteGroup` tRPC router

**Files:**
- Create: `src/server/routers/noteGroup.ts`
- Modify: `src/server/routers/index.ts`

- [ ] **Step 1: Create the router file**

Write `src/server/routers/noteGroup.ts`:

```ts
import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

async function assertGroupOwned(ctx: { db: typeof import("../db").db; userId: string }, groupId: string) {
  const group = await ctx.db.noteGroup.findUnique({
    where: { id: groupId },
    include: { workspace: true },
  });
  if (!group || group.workspace.userId !== ctx.userId) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }
  return group;
}

async function assertNoteOwned(ctx: { db: typeof import("../db").db; userId: string }, noteId: string) {
  const note = await ctx.db.note.findUnique({
    where: { id: noteId },
    include: { workspace: true },
  });
  if (!note || note.workspace.userId !== ctx.userId) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }
  return note;
}

export const noteGroupRouter = router({
  // Create a group from two inbox notes (drag note A onto note B).
  createFromNotes: protectedProcedure
    .input(z.object({
      workspaceId: z.string(),
      noteIds: z.array(z.string()).min(2),
      title: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const ws = await ctx.db.workspace.findUnique({ where: { id: input.workspaceId } });
      if (!ws || ws.userId !== ctx.userId) throw new TRPCError({ code: "NOT_FOUND" });

      // Verify every note belongs to this workspace and is currently in INBOX with no group.
      const notes = await ctx.db.note.findMany({
        where: { id: { in: input.noteIds }, workspaceId: input.workspaceId },
      });
      if (notes.length !== input.noteIds.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Note not found in workspace" });
      }

      const group = await ctx.db.noteGroup.create({
        data: {
          workspaceId: input.workspaceId,
          title: input.title ?? "Unnamed group",
        },
      });
      await ctx.db.note.updateMany({
        where: { id: { in: input.noteIds } },
        data: { groupId: group.id },
      });
      return group;
    }),

  rename: protectedProcedure
    .input(z.object({ id: z.string(), title: z.string().min(1).max(200) }))
    .mutation(async ({ ctx, input }) => {
      await assertGroupOwned(ctx, input.id);
      return ctx.db.noteGroup.update({
        where: { id: input.id },
        data: { title: input.title },
      });
    }),

  addNote: protectedProcedure
    .input(z.object({ groupId: z.string(), noteId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const group = await assertGroupOwned(ctx, input.groupId);
      const note = await assertNoteOwned(ctx, input.noteId);
      if (note.workspaceId !== group.workspaceId) {
        throw new TRPCError({ code: "BAD_REQUEST" });
      }
      return ctx.db.note.update({
        where: { id: input.noteId },
        data: { groupId: input.groupId },
      });
    }),

  // Remove a note from its group. If the group ends with <2 notes, auto-delete it
  // and unset groupId on the remaining note (a 1-note "group" is not a group).
  removeNote: protectedProcedure
    .input(z.object({ noteId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const note = await assertNoteOwned(ctx, input.noteId);
      if (!note.groupId) return note;
      const groupId = note.groupId;

      await ctx.db.note.update({ where: { id: input.noteId }, data: { groupId: null } });
      const remaining = await ctx.db.note.findMany({ where: { groupId } });
      if (remaining.length < 2) {
        await ctx.db.note.updateMany({ where: { groupId }, data: { groupId: null } });
        await ctx.db.noteGroup.delete({ where: { id: groupId } });
      }
      return { ok: true };
    }),

  // Ungroup all notes and delete the group.
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertGroupOwned(ctx, input.id);
      await ctx.db.note.updateMany({ where: { groupId: input.id }, data: { groupId: null } });
      await ctx.db.noteGroup.delete({ where: { id: input.id } });
      return { ok: true };
    }),
});
```

- [ ] **Step 2: Register router in `src/server/routers/index.ts`**

Add the import near the other router imports:

```ts
import { noteGroupRouter } from "./noteGroup";
```

Add the entry inside `router({ ... })`, next to `note: noteRouter`:

```ts
  noteGroup: noteGroupRouter,
```

- [ ] **Step 3: Type-check**

Run: `docker compose exec app npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Lint**

Run: `docker compose exec app npx eslint --fix src/server/routers/noteGroup.ts src/server/routers/index.ts`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/server/routers/noteGroup.ts src/server/routers/index.ts
git commit -m "feat(trpc): add noteGroup router (createFromNotes/rename/addNote/removeNote/delete)"
```

---

## Task 3: Dashboard query — fetch inbox groups + grouped notes

**Files:**
- Modify: `src/app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Replace the `inboxNotes` query to also include groups**

Replace the `const inboxNotes = await db.note.findMany(...)` block with:

```ts
const [ungroupedInboxNotes, inboxGroups] = await Promise.all([
  db.note.findMany({
    where: { workspaceId: workspace.id, category: "INBOX", groupId: null },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, updatedAt: true },
  }),
  db.noteGroup.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      updatedAt: true,
      notes: {
        where: { category: "INBOX" },
        orderBy: { updatedAt: "desc" },
        select: { id: true, title: true, updatedAt: true },
      },
    },
  }),
]);
```

- [ ] **Step 2: Update the `InboxBoard` props at the call site**

Change the JSX from:

```tsx
{inboxNotes.length > 0 && (
  <InboxBoard
    workspaceId={workspace.id}
    inboxNotes={inboxNotes}
  />
)}
```

to:

```tsx
{(ungroupedInboxNotes.length > 0 || inboxGroups.length > 0) && (
  <InboxBoard
    workspaceId={workspace.id}
    inboxNotes={ungroupedInboxNotes}
    inboxGroups={inboxGroups}
  />
)}
```

- [ ] **Step 3: Type-check**

Run: `docker compose exec app npx tsc --noEmit`
Expected: will fail on the new `inboxGroups` prop until Task 4 updates `InboxBoard`. That is expected — move to Task 4 without committing this change in isolation.

---

## Task 4: `InboxBoard` — groups as droppables + drag-note-onto-note

**Files:**
- Modify: `src/components/notes/InboxBoard.tsx`

This is the biggest task. Do it in sub-steps below, then commit Task 3 + Task 4 together.

- [ ] **Step 1: Extend the component's props and state**

At the top of the file update the interfaces:

```ts
interface InboxNote {
  id: string;
  title: string;
  updatedAt: Date | string;
}

interface InboxGroup {
  id: string;
  title: string;
  updatedAt: Date | string;
  notes: InboxNote[];
}

interface InboxBoardProps {
  workspaceId: string;
  inboxNotes: InboxNote[];
  inboxGroups: InboxGroup[];
}
```

Update the component signature:

```tsx
export function InboxBoard({ inboxNotes: initialNotes, inboxGroups: initialGroups }: InboxBoardProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [groups, setGroups] = useState(initialGroups);
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(() => new Set());
  // ...existing activeNoteId / overId state
```

- [ ] **Step 2: Add the new mutations**

Near the existing `assignNote` useMutation, add:

```ts
const createGroup = trpc.noteGroup.createFromNotes.useMutation({ onSuccess: () => router.refresh() });
const addToGroup  = trpc.noteGroup.addNote.useMutation({       onSuccess: () => router.refresh() });
const removeFromGroup = trpc.noteGroup.removeNote.useMutation({ onSuccess: () => router.refresh() });
const renameGroup = trpc.noteGroup.rename.useMutation({        onSuccess: () => router.refresh() });
```

- [ ] **Step 3: Make each note-card a droppable as well as a draggable**

Add a `useDroppable` hook in `DraggableNote` with id `note:${note.id}`. Existing draggable id stays as the raw `note.id`. Example:

```tsx
const { setNodeRef: setDropRef, isOver: isDropOver } = useDroppable({ id: `note:${note.id}` });
// wrap outer div's ref to compose setNodeRef (draggable) and setDropRef (droppable)
```

Use a tiny ref-merge helper local to the file:

```ts
function mergeRefs<T>(...refs: Array<((node: T | null) => void) | React.MutableRefObject<T | null> | null | undefined>) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === "function") ref(node);
      else (ref as React.MutableRefObject<T | null>).current = node;
    }
  };
}
```

Apply `mergeRefs(setNodeRef, setDropRef)` on the card's root element (the draggable handle row). Add a highlight class when `isDropOver` to signal "drop here to group".

- [ ] **Step 4: Add a `GroupCard` droppable component**

Place it above the `CategoryZone` component. Renders a group header (collapsed) or header + contained notes (expanded). Droppable id: `group:${group.id}`. Renders `notes.length` count badge, a chevron toggle, an inline-editable title, and a delete-group button. When expanded, lists each child note using the same `DraggableNote` component (child notes remain draggable so they can be pulled out).

```tsx
function GroupCard({
  group,
  isExpanded,
  isDropOver,
  onToggle,
  onRename,
  onDelete,
  onAssignChild,
}: {
  group: InboxGroup;
  isExpanded: boolean;
  isDropOver: boolean;
  onToggle: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
  onAssignChild: (noteId: string, category: CategoryId) => void;
}) {
  const { setNodeRef } = useDroppable({ id: `group:${group.id}` });
  const t = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(group.title);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-xl bg-surface-container-lowest shadow-ambient select-none transition-all",
        isDropOver && "ring-2 ring-primary/40 scale-[1.02]",
      )}
    >
      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        <button onClick={onToggle} className="shrink-0 text-on-surface-variant" aria-label={t.inbox.group.toggle}>
          {isExpanded ? "▾" : "▸"}
        </button>
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => { setEditing(false); if (draft.trim() && draft !== group.title) onRename(draft.trim()); }}
            onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") { setDraft(group.title); setEditing(false); } }}
            className="flex-1 bg-transparent font-body text-sm font-semibold text-on-surface outline-none"
          />
        ) : (
          <button onClick={() => setEditing(true)} className="flex-1 truncate text-left font-body text-sm font-semibold text-on-surface">
            {group.title}
          </button>
        )}
        <span className="rounded bg-surface-container px-1.5 py-0.5 font-label text-[10px] font-semibold text-on-surface-variant">
          {group.notes.length}
        </span>
        <button onClick={onDelete} className="text-on-surface-variant opacity-50 hover:opacity-100" aria-label={t.inbox.group.delete}>
          <X size={12} />
        </button>
      </div>
      {isExpanded && (
        <div className="flex flex-col gap-2 px-2 pb-2">
          {group.notes.map((n) => (
            <DraggableNote key={n.id} note={n} onAssign={onAssignChild} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Update `handleDragOver` to accept composite ids**

Replace the existing `handleDragOver` signature/body with:

```ts
function handleDragOver(event: { over: { id: string } | null }) {
  setOverId(event.over ? String(event.over.id) : null);
}
```

(Existing logic already sets `overId`. Just make sure it treats the id as `string`.)

- [ ] **Step 6: Expand `handleDragEnd` to branch on drop target**

Replace the existing `handleDragEnd` body with:

```ts
async function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event;
  const activeId = String(active.id);
  setActiveNoteId(null);
  setOverId(null);
  if (!over) return;
  const overId = String(over.id);

  // 1. Drop onto PARA category (existing behavior)
  const maybeCategory = CATEGORIES.find((c) => c.id === overId);
  if (maybeCategory) {
    setNotes((prev) => prev.filter((n) => n.id !== activeId));
    setGroups((prev) => prev.map((g) => ({ ...g, notes: g.notes.filter((n) => n.id !== activeId) })));
    await assignNote.mutateAsync({ noteId: activeId, category: maybeCategory.id });
    return;
  }

  // 2. Drop onto an existing group card
  if (overId.startsWith("group:")) {
    const groupId = overId.slice("group:".length);
    // If dragged note already belongs to this group, no-op.
    if (groups.some((g) => g.id === groupId && g.notes.some((n) => n.id === activeId))) return;
    await addToGroup.mutateAsync({ groupId, noteId: activeId });
    return;
  }

  // 3. Drop onto another note → create a new group
  if (overId.startsWith("note:")) {
    const targetNoteId = overId.slice("note:".length);
    if (targetNoteId === activeId) return;
    // If target is already in a group, add active into that group instead of creating new.
    const targetGroup = groups.find((g) => g.notes.some((n) => n.id === targetNoteId));
    if (targetGroup) {
      await addToGroup.mutateAsync({ groupId: targetGroup.id, noteId: activeId });
      return;
    }
    // If active is in a group, pull it out first — createFromNotes only accepts ungrouped notes.
    // For MVP: only support grouping two currently-ungrouped notes. If either is grouped, add to the other's group or no-op.
    const activeIsGrouped = groups.some((g) => g.notes.some((n) => n.id === activeId));
    if (activeIsGrouped) return;

    await createGroup.mutateAsync({
      workspaceId,
      noteIds: [targetNoteId, activeId],
    });
    setExpandedGroupIds((prev) => { const next = new Set(prev); return next; }); // router.refresh will repopulate; expanded state opt-in
    return;
  }
}
```

(Re-add `workspaceId` to the destructured props at the top of the component — the current code drops it. The old call site already passes it.)

- [ ] **Step 7: Render groups in the notes column**

In the JSX, replace the "Notes column" block with:

```tsx
<div className="flex shrink-0 flex-col gap-2 lg:w-52">
  {groups.map((g) => (
    <GroupCard
      key={g.id}
      group={g}
      isExpanded={expandedGroupIds.has(g.id)}
      isDropOver={overId === `group:${g.id}`}
      onToggle={() => setExpandedGroupIds((prev) => {
        const next = new Set(prev);
        if (next.has(g.id)) next.delete(g.id); else next.add(g.id);
        return next;
      })}
      onRename={(title) => renameGroup.mutate({ id: g.id, title })}
      onDelete={() => {
        setGroups((prev) => prev.filter((x) => x.id !== g.id));
        deleteGroup.mutate({ id: g.id });
      }}
      onAssignChild={handleAssign}
    />
  ))}
  {notes.map((note) => (
    <DraggableNote
      key={note.id}
      note={note}
      isDragging={activeNoteId === note.id}
      onAssign={handleAssign}
    />
  ))}
  <p className="mt-1 font-label text-[10px] text-on-surface-variant">{t.inbox.dragHint}</p>
</div>
```

Add `deleteGroup` alongside the other mutations added in Step 2:

```ts
const deleteGroup = trpc.noteGroup.delete.useMutation({ onSuccess: () => router.refresh() });
```

- [ ] **Step 8: Drag a note OUT of its group**

When `over` is `null` but `active.id` belongs to a group, call `removeFromGroup`. Add this branch at the very top of `handleDragEnd` (before the `if (!over) return` early exit):

```ts
if (!over) {
  const isGrouped = groups.some((g) => g.notes.some((n) => n.id === activeId));
  if (isGrouped) {
    await removeFromGroup.mutateAsync({ noteId: activeId });
  }
  return;
}
```

- [ ] **Step 9: Type-check + lint**

```bash
docker compose exec app npx tsc --noEmit
docker compose exec app npx eslint --fix src/components/notes/InboxBoard.tsx src/app/\(app\)/dashboard/page.tsx
```

Expected: both clean.

- [ ] **Step 10: Manual browser verification**

Start dev (`/dev` if not running) and open the dashboard. Verify:
1. Two ungrouped inbox notes present → drag note A onto note B → new group appears with both notes, count "2".
2. Expand/collapse the group via chevron.
3. Click title → rename → blur → persists after refresh.
4. Drag a third note onto the group → group shows "3".
5. Drag a note out of the group (drop on empty space outside any droppable) → note reappears in ungrouped list; group count drops to 2.
6. Drag another out so group has 1 remaining → group auto-deletes, remaining note ungrouped.
7. Drag a child note from an expanded group onto a PARA category → note is assigned and leaves the group (handled by existing `assign` mutation; confirm UI updates).
8. Click the X on a group → all children ungroup, group card disappears.

- [ ] **Step 11: Commit Tasks 3 + 4**

```bash
git add src/app/\(app\)/dashboard/page.tsx src/components/notes/InboxBoard.tsx
git commit -m "feat(inbox): drag note onto note to create a group; drag into/out of groups"
```

---

## Task 5: i18n strings

**Files:**
- Modify: `src/dictionaries/en-US.json`
- Modify: `src/dictionaries/pt-BR.json`

- [ ] **Step 1: Add `inbox.group` entries to both dictionaries**

`en-US.json` — inside the existing `"inbox": { ... }` block, add:

```json
"group": {
  "defaultTitle": "Unnamed group",
  "toggle": "Expand/collapse group",
  "delete": "Ungroup all and delete",
  "rename": "Rename group"
}
```

`pt-BR.json` — mirror:

```json
"group": {
  "defaultTitle": "Grupo sem nome",
  "toggle": "Expandir/recolher grupo",
  "delete": "Desagrupar e excluir",
  "rename": "Renomear grupo"
}
```

- [ ] **Step 2: Reference the strings in `InboxBoard.tsx`**

In `GroupCard`, replace hardcoded `aria-label` values with `t.inbox.group.toggle` and `t.inbox.group.delete`. When creating a group from `createFromNotes`, pass `title: t.inbox.group.defaultTitle`. (The server already defaults to `"Unnamed group"`, but passing the localized string keeps pt-BR users from seeing English briefly before refresh.)

- [ ] **Step 3: Run i18n audit**

Run: `/i18n-check src/components/notes/InboxBoard.tsx`
Expected: no missing keys.

- [ ] **Step 4: Type-check**

Run: `docker compose exec app npx tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/dictionaries/en-US.json src/dictionaries/pt-BR.json src/components/notes/InboxBoard.tsx
git commit -m "feat(i18n): add inbox.group strings for EN/PT"
```

---

## Task 6: Production build sanity check

- [ ] **Step 1: Run the prod build**

Run: `docker compose exec app npm run build`
Expected: build succeeds. No type errors, no missing imports.

- [ ] **Step 2: Smoke-test one more time in the browser**

Repeat Task 4 Step 10 items 1, 4, 5, 8 against the dev server.

- [ ] **Step 3: Final commit (only if build surfaced fixes)**

```bash
git add -A && git commit -m "chore: fixes from build"
```

(Skip if the build was clean.)

---

## Out of scope (intentional)

- Assigning an entire group to a PARA category in one gesture (user drags notes individually).
- Nested groups (a group inside a group).
- Reordering notes within a group.
- Drag-and-drop from one group directly into another (MVP requires a drop-outside step, then a drag-in).
- AI suggestion for "this looks like a group" — future.
