# Search Notes & Containers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full-text search across notes, projects, areas, and resources via a Cmd+K command palette and client-side list filters.

**Architecture:** Postgres full-text search with `tsvector` columns and GIN indexes on Note, Project, Area, and Resource tables. A single `search.search` tRPC procedure runs a `UNION ALL` query across all four tables with `ts_rank` for relevance ordering. The frontend has two surfaces: a `CommandPalette` modal (Cmd+K) for global search and a `ListFilter` component for client-side filtering on list pages.

**Tech Stack:** Prisma 7 (raw SQL migration), tRPC 11, React 19, Next.js 16, Tailwind v4, Phosphor Icons

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `prisma/migrations/YYYYMMDD_search_vectors/migration.sql` | Add tsvector columns, GIN indexes, triggers |
| Create | `src/server/routers/search.ts` | `search.search` tRPC procedure |
| Modify | `src/server/routers/index.ts:1-24` | Register search router |
| Create | `src/components/CommandPalette.tsx` | Cmd+K modal with search UI |
| Create | `src/components/ListFilter.tsx` | Client-side filter input for list pages |
| Modify | `src/app/(app)/layout.tsx:55-58` | Mount CommandPalette |
| Modify | `src/components/projects/ProjectsView.tsx:228-295` | Add ListFilter to projects |
| Modify | `src/app/(app)/[workspaceSlug]/areas/page.tsx:71-115` | Add ListFilter to areas |
| Modify | `src/app/(app)/[workspaceSlug]/resources/page.tsx:94-158` | Add ListFilter to resources |
| Modify | `src/dictionaries/en-US.json` | Add search/filter i18n keys |
| Modify | `src/dictionaries/pt-BR.json` | Add search/filter i18n keys |

---

### Task 1: Database Migration — Full-Text Search Vectors

**Files:**
- Create: `prisma/migrations/<timestamp>_search_vectors/migration.sql`

- [ ] **Step 1: Create the migration SQL file**

Run inside the container to generate an empty migration:

```bash
docker compose exec app npx prisma migrate dev --create-only --name search_vectors
```

Then replace the generated empty SQL with the following content in the newly created `migration.sql`:

```sql
-- Note: add search_vector column + GIN index + trigger
ALTER TABLE "Note" ADD COLUMN "search_vector" tsvector;

CREATE INDEX "Note_search_vector_idx" ON "Note" USING GIN ("search_vector");

CREATE OR REPLACE FUNCTION note_search_vector_update() RETURNS trigger AS $$
DECLARE
  plain_text TEXT := '';
  body_json JSONB;
  tag_text TEXT := '';
BEGIN
  -- Extract plain text from BlockNote JSON body
  IF NEW.body IS NOT NULL AND NEW.body != '' THEN
    BEGIN
      body_json := NEW.body::jsonb;
      SELECT string_agg(elem, ' ') INTO plain_text
      FROM jsonb_path_query(body_json, 'strict $.**.text') AS elem;
    EXCEPTION WHEN OTHERS THEN
      -- Legacy HTML: strip tags
      plain_text := regexp_replace(NEW.body, '<[^>]+>', ' ', 'g');
    END;
  END IF;

  -- Join tags array
  IF NEW.tags IS NOT NULL THEN
    tag_text := array_to_string(NEW.tags, ' ');
  END IF;

  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(plain_text, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(tag_text, '')), 'C');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER note_search_vector_trigger
  BEFORE INSERT OR UPDATE ON "Note"
  FOR EACH ROW EXECUTE FUNCTION note_search_vector_update();

-- Project: add search_vector column + GIN index + trigger
ALTER TABLE "Project" ADD COLUMN "search_vector" tsvector;

CREATE INDEX "Project_search_vector_idx" ON "Project" USING GIN ("search_vector");

CREATE OR REPLACE FUNCTION project_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER project_search_vector_trigger
  BEFORE INSERT OR UPDATE ON "Project"
  FOR EACH ROW EXECUTE FUNCTION project_search_vector_update();

-- Area: add search_vector column + GIN index + trigger
ALTER TABLE "Area" ADD COLUMN "search_vector" tsvector;

CREATE INDEX "Area_search_vector_idx" ON "Area" USING GIN ("search_vector");

CREATE OR REPLACE FUNCTION area_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER area_search_vector_trigger
  BEFORE INSERT OR UPDATE ON "Area"
  FOR EACH ROW EXECUTE FUNCTION area_search_vector_update();

-- Resource: add search_vector column + GIN index + trigger
ALTER TABLE "Resource" ADD COLUMN "search_vector" tsvector;

CREATE INDEX "Resource_search_vector_idx" ON "Resource" USING GIN ("search_vector");

CREATE OR REPLACE FUNCTION resource_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER resource_search_vector_trigger
  BEFORE INSERT OR UPDATE ON "Resource"
  FOR EACH ROW EXECUTE FUNCTION resource_search_vector_update();

-- Backfill existing rows so search_vector is populated
UPDATE "Note" SET title = title WHERE true;
UPDATE "Project" SET title = title WHERE true;
UPDATE "Area" SET title = title WHERE true;
UPDATE "Resource" SET title = title WHERE true;
```

- [ ] **Step 2: Apply the migration**

```bash
docker compose exec app npx prisma migrate dev
```

Expected: Migration applies successfully. All four tables now have `search_vector` columns with GIN indexes and triggers.

- [ ] **Step 3: Verify the migration worked**

```bash
docker compose exec app npx prisma db execute --stdin <<'SQL'
SELECT id, search_vector IS NOT NULL as has_vector FROM "Note" LIMIT 3;
SQL
```

Expected: Rows returned with `has_vector = true` (or no rows if DB is empty, which is fine).

- [ ] **Step 4: Restart the app container**

```bash
docker compose restart app
```

- [ ] **Step 5: Commit**

```bash
git add prisma/migrations/
git commit -m "feat(db): add full-text search vectors and triggers for Note, Project, Area, Resource"
```

---

### Task 2: i18n — Add Search and Filter Strings

**Files:**
- Modify: `src/dictionaries/en-US.json`
- Modify: `src/dictionaries/pt-BR.json`

- [ ] **Step 1: Add search keys to en-US.json**

Add this block after the `"settings"` section (before the closing `}`):

```json
  "search": {
    "placeholder": "Search\u2026",
    "noResults": "No results for",
    "typeAll": "All",
    "typeNotes": "Notes",
    "typeProjects": "Projects",
    "typeAreas": "Areas",
    "typeResources": "Resources",
    "hint": "\u2318K to search"
  },
  "listFilter": {
    "placeholder": "Filter\u2026",
    "noMatches": "No matches"
  }
```

- [ ] **Step 2: Add search keys to pt-BR.json**

Add this block after the `"settings"` section (before the closing `}`):

```json
  "search": {
    "placeholder": "Buscar\u2026",
    "noResults": "Nenhum resultado para",
    "typeAll": "Todos",
    "typeNotes": "Notas",
    "typeProjects": "Projetos",
    "typeAreas": "\u00c1reas",
    "typeResources": "Recursos",
    "hint": "\u2318K para buscar"
  },
  "listFilter": {
    "placeholder": "Filtrar\u2026",
    "noMatches": "Nenhuma correspond\u00eancia"
  }
```

- [ ] **Step 3: Verify i18n consistency**

```bash
docker compose exec app npx tsx -e "
const en = require('./src/dictionaries/en-US.json');
const pt = require('./src/dictionaries/pt-BR.json');
console.log('en search keys:', Object.keys(en.search));
console.log('pt search keys:', Object.keys(pt.search));
console.log('en listFilter keys:', Object.keys(en.listFilter));
console.log('pt listFilter keys:', Object.keys(pt.listFilter));
"
```

Expected: Same keys in both files.

- [ ] **Step 4: Commit**

```bash
git add src/dictionaries/en-US.json src/dictionaries/pt-BR.json
git commit -m "feat(i18n): add search and list filter strings for en-US and pt-BR"
```

---

### Task 3: Backend — Search Router

**Files:**
- Create: `src/server/routers/search.ts`
- Modify: `src/server/routers/index.ts:1-24`

- [ ] **Step 1: Create the search router**

Create `src/server/routers/search.ts`:

```ts
import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { Prisma } from "@/generated/prisma/client";

const SearchResultType = z.enum(["note", "project", "area", "resource"]);

export const searchRouter = router({
  search: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        query: z.string().min(1),
        type: SearchResultType.optional(),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const ws = await ctx.db.workspace.findUnique({
        where: { id: input.workspaceId },
      });
      if (!ws || ws.userId !== ctx.userId)
        throw new TRPCError({ code: "NOT_FOUND" });

      // Build prefix query: "hello world" → "hello:* & world:*"
      const terms = input.query
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((t) => `${t}:*`)
        .join(" & ");

      if (!terms) return [];

      const workspaceId = input.workspaceId;
      const limit = input.limit;

      const parts: Prisma.Sql[] = [];

      if (!input.type || input.type === "note") {
        parts.push(Prisma.sql`
          SELECT id, title, 'note' AS type, icon, category::text AS category,
                 ts_rank(search_vector, to_tsquery('simple', ${terms})) AS rank,
                 ts_headline('simple', title, to_tsquery('simple', ${terms}),
                   'StartSel=<mark>, StopSel=</mark>, MaxWords=35, MinWords=15') AS headline
          FROM "Note"
          WHERE "workspaceId" = ${workspaceId}
            AND search_vector @@ to_tsquery('simple', ${terms})
        `);
      }

      if (!input.type || input.type === "project") {
        parts.push(Prisma.sql`
          SELECT id, title, 'project' AS type, icon, NULL AS category,
                 ts_rank(search_vector, to_tsquery('simple', ${terms})) AS rank,
                 ts_headline('simple', title, to_tsquery('simple', ${terms}),
                   'StartSel=<mark>, StopSel=</mark>, MaxWords=35, MinWords=15') AS headline
          FROM "Project"
          WHERE "workspaceId" = ${workspaceId}
            AND search_vector @@ to_tsquery('simple', ${terms})
        `);
      }

      if (!input.type || input.type === "area") {
        parts.push(Prisma.sql`
          SELECT id, title, 'area' AS type, icon, NULL AS category,
                 ts_rank(search_vector, to_tsquery('simple', ${terms})) AS rank,
                 ts_headline('simple', title, to_tsquery('simple', ${terms}),
                   'StartSel=<mark>, StopSel=</mark>, MaxWords=35, MinWords=15') AS headline
          FROM "Area"
          WHERE "workspaceId" = ${workspaceId}
            AND search_vector @@ to_tsquery('simple', ${terms})
        `);
      }

      if (!input.type || input.type === "resource") {
        parts.push(Prisma.sql`
          SELECT id, title, 'resource' AS type, icon, NULL AS category,
                 ts_rank(search_vector, to_tsquery('simple', ${terms})) AS rank,
                 ts_headline('simple', title, to_tsquery('simple', ${terms}),
                   'StartSel=<mark>, StopSel=</mark>, MaxWords=35, MinWords=15') AS headline
          FROM "Resource"
          WHERE "workspaceId" = ${workspaceId}
            AND search_vector @@ to_tsquery('simple', ${terms})
        `);
      }

      if (parts.length === 0) return [];

      // Join with UNION ALL
      let query = parts[0]!;
      for (let i = 1; i < parts.length; i++) {
        query = Prisma.sql`${query} UNION ALL ${parts[i]!}`;
      }
      query = Prisma.sql`${query} ORDER BY rank DESC LIMIT ${limit}`;

      const results = await ctx.db.$queryRaw<
        {
          id: string;
          title: string;
          type: "note" | "project" | "area" | "resource";
          icon: string;
          category: string | null;
          rank: number;
          headline: string;
        }[]
      >(query);

      return results;
    }),
});
```

- [ ] **Step 2: Register the search router in index.ts**

In `src/server/routers/index.ts`, add the import and register it:

Add after line 9 (`import { commentRouter } from "./comment";`):
```ts
import { searchRouter } from "./search";
```

Add `search: searchRouter,` inside the `router({})` call, after `comment: commentRouter,`:
```ts
  search: searchRouter,
```

- [ ] **Step 3: Verify the build compiles**

```bash
docker compose exec app npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add src/server/routers/search.ts src/server/routers/index.ts
git commit -m "feat(api): add search.search tRPC procedure with Postgres full-text search"
```

---

### Task 4: Frontend — CommandPalette Component

**Files:**
- Create: `src/components/CommandPalette.tsx`
- Modify: `src/app/(app)/layout.tsx:55-58`

- [ ] **Step 1: Create the CommandPalette component**

Create `src/components/CommandPalette.tsx`:

```tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { MagnifyingGlass, X, Notebook, Rocket, TreeStructure, Books } from "@/components/ui/icons";
import { useTranslation } from "@/lib/i18n-client";

const TYPE_ICONS = {
  note: Notebook,
  project: Rocket,
  area: TreeStructure,
  resource: Books,
} as const;

const TYPE_COLORS = {
  note: "text-primary",
  project: "text-primary",
  area: "text-secondary",
  resource: "text-tertiary",
} as const;

type SearchType = "note" | "project" | "area" | "resource";

interface CommandPaletteProps {
  workspaceId: string;
  workspaceSlug: string;
}

export function CommandPalette({ workspaceId, workspaceSlug }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<SearchType | undefined>(undefined);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const t = useTranslation();

  // Debounce query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Cmd+K listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setQuery("");
      setDebouncedQuery("");
      setTypeFilter(undefined);
      setActiveIndex(0);
    }
  }, [open]);

  // Search query
  const { data: results, isLoading } = trpc.search.search.useQuery(
    { workspaceId, query: debouncedQuery, type: typeFilter, limit: 20 },
    { enabled: open && debouncedQuery.length > 0 }
  );

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0);
  }, [results]);

  const navigate = useCallback(
    (result: { id: string; type: SearchType }) => {
      setOpen(false);
      const paths: Record<SearchType, string> = {
        note: `/note/${result.id}`,
        project: `/${workspaceSlug}/projects/${result.id}`,
        area: `/${workspaceSlug}/areas/${result.id}`,
        resource: `/${workspaceSlug}/resources/${result.id}`,
      };
      router.push(paths[result.type]);
    },
    [router, workspaceSlug]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!results || results.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % results.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + results.length) % results.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const result = results[activeIndex];
        if (result) navigate(result);
      }
    },
    [results, activeIndex, navigate]
  );

  if (!open) return null;

  const typeFilters: { key: SearchType | undefined; label: string }[] = [
    { key: undefined, label: t.search.typeAll },
    { key: "note", label: t.search.typeNotes },
    { key: "project", label: t.search.typeProjects },
    { key: "area", label: t.search.typeAreas },
    { key: "resource", label: t.search.typeResources },
  ];

  // Group results by type
  const grouped = (results ?? []).reduce(
    (acc, r) => {
      if (!acc[r.type]) acc[r.type] = [];
      acc[r.type]!.push(r);
      return acc;
    },
    {} as Record<SearchType, typeof results>
  );

  // Flat list for index tracking
  const flatResults = results ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-scrim/40 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-xl rounded-2xl bg-surface-container-low shadow-[0_24px_80px_rgba(0,0,0,0.3)] border border-outline-variant/10"
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-outline-variant/10 px-4 py-3">
          <MagnifyingGlass size={20} className="shrink-0 text-on-surface-variant" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.search.placeholder}
            className="flex-1 bg-transparent font-body text-base text-on-surface placeholder:text-on-surface-variant/50 outline-none"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-on-surface-variant hover:text-on-surface">
              <X size={16} />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center rounded bg-surface-container px-1.5 py-0.5 font-label text-[10px] text-on-surface-variant">
            ESC
          </kbd>
        </div>

        {/* Type filter chips */}
        <div className="flex gap-1.5 px-4 py-2 border-b border-outline-variant/10">
          {typeFilters.map(({ key, label }) => (
            <button
              key={label}
              onClick={() => setTypeFilter(key)}
              className={cn(
                "rounded-lg px-2.5 py-1 font-label text-[11px] font-medium transition-colors",
                typeFilter === key
                  ? "bg-primary-container text-on-primary-container"
                  : "text-on-surface-variant hover:bg-surface-container"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2">
          {isLoading && debouncedQuery && (
            <p className="px-3 py-8 text-center font-body text-sm text-on-surface-variant">
              {t.common.loading}
            </p>
          )}

          {!isLoading && debouncedQuery && flatResults.length === 0 && (
            <p className="px-3 py-8 text-center font-body text-sm text-on-surface-variant">
              {t.search.noResults} &ldquo;{debouncedQuery}&rdquo;
            </p>
          )}

          {!debouncedQuery && (
            <p className="px-3 py-8 text-center font-body text-sm text-on-surface-variant/50">
              {t.search.hint}
            </p>
          )}

          {flatResults.length > 0 &&
            (["note", "project", "area", "resource"] as SearchType[])
              .filter((type) => grouped[type]?.length)
              .map((type) => {
                const Icon = TYPE_ICONS[type];
                const sectionLabel =
                  type === "note" ? t.search.typeNotes :
                  type === "project" ? t.search.typeProjects :
                  type === "area" ? t.search.typeAreas :
                  t.search.typeResources;

                return (
                  <div key={type} className="mb-1">
                    <p className="px-3 py-1.5 font-label text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                      {sectionLabel}
                    </p>
                    {grouped[type]!.map((result) => {
                      const globalIndex = flatResults.indexOf(result);
                      return (
                        <button
                          key={`${result.type}-${result.id}`}
                          onClick={() => navigate(result)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                            globalIndex === activeIndex
                              ? "bg-surface-container-lowest text-on-surface shadow-ambient"
                              : "text-on-surface-variant hover:bg-surface-container"
                          )}
                        >
                          <Icon size={18} className={cn("shrink-0", TYPE_COLORS[result.type])} />
                          <div className="min-w-0 flex-1">
                            <p
                              className="font-headline text-sm font-semibold text-on-surface truncate"
                              dangerouslySetInnerHTML={{ __html: result.headline }}
                            />
                          </div>
                          {result.category && (
                            <span className="shrink-0 rounded bg-surface-container px-1.5 py-0.5 font-label text-[9px] uppercase tracking-wide text-on-surface-variant">
                              {result.category}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Check which icons are available from the icons barrel export**

Read `src/components/ui/icons.tsx` (or wherever Phosphor icons are re-exported) to confirm `MagnifyingGlass`, `X`, `Notebook`, `Rocket`, `TreeStructure`, and `Books` are exported. If `Notebook` or `MagnifyingGlass` are not exported, add them. If there is no barrel file, import directly from `@phosphor-icons/react`.

- [ ] **Step 3: Mount CommandPalette in the app layout**

The app layout at `src/app/(app)/layout.tsx` is a server component. Since `CommandPalette` needs `workspaceId` and `workspaceSlug`, and these are only available in workspace-scoped pages, mount it in the workspace layout instead.

Check if `src/app/(app)/[workspaceSlug]/layout.tsx` exists. If not, the best place is to create a thin client wrapper that reads workspace context. However, looking at the codebase, each page under `[workspaceSlug]` independently fetches workspace data. The simplest approach is to mount the `CommandPalette` in the main `(app)/layout.tsx` as a client component that reads workspace context from the URL.

Create a wrapper: modify `src/app/(app)/layout.tsx` to include a `CommandPaletteWrapper` that extracts workspaceSlug from the URL and fetches workspaceId via tRPC.

Actually — simpler approach: the `Sidebar` already receives `workspaceSlug` and `workspaceName`. But the `(app)/layout.tsx` doesn't have workspace context. Instead, add the `CommandPalette` to the `Sidebar` component since it's already a client component with `workspaceSlug`, and is present on every workspace page.

In `src/components/layout/Sidebar.tsx`, add the import and render `CommandPalette`. But the Sidebar doesn't have `workspaceId`. We need to add it.

**Better approach:** Create a `CommandPaletteProvider` that wraps all pages and mounts the palette. Pass `workspaceId` and `workspaceSlug` as props to `Sidebar`, which already has `workspaceSlug`. Add `workspaceId` to `SidebarProps`.

Modify `src/components/layout/Sidebar.tsx`:

Add to the import block:
```tsx
import { CommandPalette } from "@/components/CommandPalette";
```

Add `workspaceId: string;` to `SidebarProps`:
```tsx
interface SidebarProps {
  workspaceSlug: string;
  workspaceName: string;
  workspaceId: string;
  locale: string;
}
```

Update the function signature:
```tsx
export function Sidebar({ workspaceSlug, workspaceName, workspaceId, locale }: SidebarProps) {
```

Add before the closing `</aside>`:
```tsx
      <CommandPalette workspaceId={workspaceId} workspaceSlug={workspaceSlug} />
```

- [ ] **Step 4: Pass workspaceId to Sidebar in all pages that render it**

There are 6 pages that render `<Sidebar>`. Each needs `workspaceId={workspace.id}` added to the Sidebar props:

1. `src/app/(app)/[workspaceSlug]/projects/page.tsx:48` — add `workspaceId={workspace.id}`
2. `src/app/(app)/[workspaceSlug]/projects/[id]/page.tsx:69` — add `workspaceId={workspace.id}`
3. `src/app/(app)/[workspaceSlug]/areas/page.tsx:49` — add `workspaceId={workspace.id}`
4. `src/app/(app)/[workspaceSlug]/areas/[id]/page.tsx` — add `workspaceId={workspace.id}`
5. `src/app/(app)/[workspaceSlug]/resources/page.tsx:59` — add `workspaceId={workspace.id}`
6. `src/app/(app)/[workspaceSlug]/resources/[id]/page.tsx` — add `workspaceId={workspace.id}`
7. `src/app/(app)/[workspaceSlug]/archive/page.tsx` — add `workspaceId={workspace.id}`

For each, change `<Sidebar workspaceSlug={workspaceSlug} workspaceName={workspace.name} locale={locale} />` to `<Sidebar workspaceSlug={workspaceSlug} workspaceName={workspace.name} workspaceId={workspace.id} locale={locale} />`.

- [ ] **Step 5: Verify the build compiles**

```bash
docker compose exec app npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/CommandPalette.tsx src/components/layout/Sidebar.tsx src/app/
git commit -m "feat(ui): add Cmd+K command palette for global search"
```

---

### Task 5: Frontend — ListFilter Component

**Files:**
- Create: `src/components/ListFilter.tsx`

- [ ] **Step 1: Create the ListFilter component**

Create `src/components/ListFilter.tsx`:

```tsx
"use client";

import { useState } from "react";
import { MagnifyingGlass } from "@/components/ui/icons";
import { useTranslation } from "@/lib/i18n-client";

export function ListFilter<T extends { title: string }>({
  items,
  onFilter,
}: {
  items: T[];
  onFilter: (filtered: T[]) => void;
}) {
  const [query, setQuery] = useState("");
  const t = useTranslation();

  function handleChange(value: string) {
    setQuery(value);
    if (!value.trim()) {
      onFilter(items);
    } else {
      const lower = value.toLowerCase();
      onFilter(items.filter((item) => item.title.toLowerCase().includes(lower)));
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-xl bg-surface-container-low px-3 py-2">
      <MagnifyingGlass size={16} className="shrink-0 text-on-surface-variant" />
      <input
        type="text"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={t.listFilter.placeholder}
        className="bg-transparent font-body text-sm text-on-surface placeholder:text-on-surface-variant/50 outline-none w-36"
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ListFilter.tsx
git commit -m "feat(ui): add ListFilter component for client-side list filtering"
```

---

### Task 6: Integrate ListFilter into Projects Page

**Files:**
- Modify: `src/components/projects/ProjectsView.tsx:228-295`

- [ ] **Step 1: Add ListFilter to ProjectsView**

In `src/components/projects/ProjectsView.tsx`:

Add the import at the top:
```tsx
import { ListFilter } from "@/components/ListFilter";
```

Inside the `ProjectsView` component, add a `filteredProjects` state. Change the component to:

After `const [view, setView] = useState<"grid" | "list">("grid");` (line 230), add:
```tsx
  const [filteredProjects, setFilteredProjects] = useState<ProjectItem[]>(projects);
```

Replace `const active = projects.filter(...)` with:
```tsx
  const active = filteredProjects.filter((p) => (p.status ?? "ACTIVE") !== "COMPLETED");
```

In the toggle bar div (around line 237), add the ListFilter next to the view toggle buttons. Change the `<div className="flex items-center justify-between mb-8">` section to:

```tsx
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="flex rounded-xl bg-surface-container-low p-1">
            <button
              onClick={() => setView("grid")}
              className={`rounded-lg px-4 py-2 transition-colors ${view === "grid" ? "bg-surface-container-lowest text-primary shadow-ambient" : "text-on-surface-variant hover:text-on-surface"}`}
            >
              <SquaresFour size={20} />
            </button>
            <button
              onClick={() => setView("list")}
              className={`rounded-lg px-4 py-2 transition-colors ${view === "list" ? "bg-surface-container-lowest text-primary shadow-ambient" : "text-on-surface-variant hover:text-on-surface"}`}
            >
              <List size={20} />
            </button>
          </div>
          <ListFilter items={projects} onFilter={(f) => setFilteredProjects(f as ProjectItem[])} />
        </div>
        <span className="font-label text-xs text-on-surface-variant">
          {active.length} {active.length === 1 ? t.projects.activeCount_one : t.projects.activeCount_other}
        </span>
      </div>
```

If `active.length === 0` and there was a filter query, consider showing the `listFilter.noMatches` string. Add after the grid/list views (before the closing `</>`):

```tsx
      {active.length === 0 && filteredProjects.length < projects.length && (
        <p className="py-12 text-center font-body text-sm text-on-surface-variant">
          {t.listFilter.noMatches}
        </p>
      )}
```

- [ ] **Step 2: Verify the build compiles**

```bash
docker compose exec app npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/projects/ProjectsView.tsx
git commit -m "feat(ui): integrate ListFilter into projects page"
```

---

### Task 7: Integrate ListFilter into Areas Page

**Files:**
- Modify: `src/app/(app)/[workspaceSlug]/areas/page.tsx:47-138`

The areas page is a server component that directly renders area cards. To add client-side filtering, extract the area cards grid into a client component.

- [ ] **Step 1: Create AreasView client component**

Create `src/components/areas/AreasView.tsx`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { TreeStructure } from "@/components/ui/icons";
import { IconPicker } from "@/components/ui/IconPicker";
import { ListFilter } from "@/components/ListFilter";
import { useTranslation } from "@/lib/i18n-client";
import { plural } from "@/lib/utils";

type AreaItem = {
  id: string;
  title: string;
  icon: string;
  description: string | null;
  _count: { notes: number; projects: number; resources: number };
};

interface AreasViewProps {
  areas: AreaItem[];
  workspaceSlug: string;
}

export function AreasView({ areas, workspaceSlug }: AreasViewProps) {
  const t = useTranslation();
  const [filtered, setFiltered] = useState<AreaItem[]>(areas);

  if (areas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <TreeStructure size={48} className="text-on-surface-variant" />
        <p className="mt-4 font-headline text-lg font-semibold text-on-surface">
          {t.areas.emptyTitle}
        </p>
        <p className="mt-1 font-body text-sm text-on-surface-variant">
          {t.areas.emptyDescription}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4">
        <ListFilter items={areas} onFilter={(f) => setFiltered(f as AreaItem[])} />
      </div>

      {filtered.length === 0 ? (
        <p className="py-12 text-center font-body text-sm text-on-surface-variant">
          {t.listFilter.noMatches}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((area) => (
            <div
              key={area.id}
              className="group relative rounded-xl bg-surface-container-lowest p-5 shadow-ambient transition-shadow hover:shadow-[0_16px_48px_rgba(42,52,57,0.10)]"
            >
              <div className="mb-3">
                <IconPicker
                  entityType="area"
                  entityId={area.id}
                  currentIcon={area.icon}
                  entityTitle={area.title}
                  accentClass="text-secondary"
                  bgClass="bg-secondary-container/20"
                />
              </div>

              <Link href={`/${workspaceSlug}/areas/${area.id}`} className="block">
                <h3 className="font-headline text-base font-semibold text-on-surface group-hover:text-secondary transition-colors">
                  {area.title}
                </h3>
                {area.description && (
                  <p className="mt-1.5 font-body text-sm text-on-surface-variant line-clamp-2">
                    {area.description}
                  </p>
                )}
                <div className="mt-4 flex items-center gap-3 flex-wrap">
                  <p className="font-label text-[11px] uppercase tracking-widest text-on-surface-variant">
                    {plural(area._count.projects, t.areas.project_one, t.areas.project_other)}
                  </p>
                  <span className="text-outline-variant">·</span>
                  <p className="font-label text-[11px] uppercase tracking-widest text-on-surface-variant">
                    {plural(area._count.resources, t.areas.resource_one, t.areas.resource_other)}
                  </p>
                  <span className="text-outline-variant">·</span>
                  <p className="font-label text-[11px] uppercase tracking-widest text-on-surface-variant">
                    {plural(area._count.notes, t.areas.note_one, t.areas.note_other)}
                  </p>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Update areas page to use AreasView**

In `src/app/(app)/[workspaceSlug]/areas/page.tsx`, replace the inline grid rendering with the `AreasView` component.

Remove the `Area` type import. Add:
```tsx
import { AreasView } from "@/components/areas/AreasView";
```

Replace the content inside `<div className="px-8 py-6">` (the conditional block from line 60 to 115) with:
```tsx
          <AreasView areas={workspace.areas as any} workspaceSlug={workspaceSlug} />
```

Remove unused imports: `IconPicker`, `Link`, `TreeStructure`, `plural`, and the `Area` type import.

- [ ] **Step 3: Verify the build compiles**

```bash
docker compose exec app npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/areas/AreasView.tsx src/app/\(app\)/\[workspaceSlug\]/areas/page.tsx
git commit -m "feat(ui): integrate ListFilter into areas page via AreasView component"
```

---

### Task 8: Integrate ListFilter into Resources Page

**Files:**
- Modify: `src/app/(app)/[workspaceSlug]/resources/page.tsx:94-158`

Same pattern as areas — extract the resource list into a client component.

- [ ] **Step 1: Create ResourcesView client component**

Create `src/components/resources/ResourcesView.tsx`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Books, TreeStructure } from "@/components/ui/icons";
import { IconPicker } from "@/components/ui/IconPicker";
import { PickedIcon } from "@/components/ui/PickedIcon";
import { ListFilter } from "@/components/ListFilter";
import { useTranslation } from "@/lib/i18n-client";

type AreaSnippet = { id: string; title: string; icon: string };

type ResourceItem = {
  id: string;
  title: string;
  icon: string;
  description: string | null;
  _count: { notes: number };
  area: AreaSnippet | null;
};

interface ResourcesViewProps {
  resources: ResourceItem[];
  workspaceSlug: string;
}

export function ResourcesView({ resources, workspaceSlug }: ResourcesViewProps) {
  const t = useTranslation();
  const [filtered, setFiltered] = useState<ResourceItem[]>(resources);

  if (resources.length === 0) {
    return (
      <div className="mx-auto max-w-5xl px-10 py-24 text-center">
        <Books size={48} className="text-on-surface-variant" />
        <p className="mt-4 font-headline text-lg font-semibold text-on-surface">
          {t.resources.emptyTitle}
        </p>
        <p className="mt-1 font-body text-sm text-on-surface-variant">
          {t.resources.emptyDescription}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-10 pb-16">
      <div className="mb-4">
        <ListFilter items={resources} onFilter={(f) => setFiltered(f as ResourceItem[])} />
      </div>

      {filtered.length === 0 ? (
        <p className="py-12 text-center font-body text-sm text-on-surface-variant">
          {t.listFilter.noMatches}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-x-12">
          {filtered.map((resource, i) => (
            <div
              key={resource.id}
              className="group grid items-center gap-x-4 border-b border-surface-container-high transition-colors hover:bg-surface-container-low"
              style={{ gridTemplateColumns: "44px 44px 1fr auto", margin: "0 -16px", padding: "16px 16px" }}
            >
              <span className="font-body text-sm font-light tabular-nums text-on-surface-variant transition-colors group-hover:text-tertiary self-center">
                {String(i + 1).padStart(2, "0")}
              </span>

              <div className="self-center">
                <IconPicker
                  entityType="resource"
                  entityId={resource.id}
                  currentIcon={resource.icon}
                  entityTitle={resource.title}
                  accentClass="text-tertiary"
                  bgClass="bg-tertiary-container/20"
                />
              </div>

              <Link href={`/${workspaceSlug}/resources/${resource.id}`} className="min-w-0 block">
                <h2 className="font-headline text-base font-bold text-on-surface transition-colors group-hover:text-tertiary">
                  {resource.title}
                </h2>
                {resource.description && (
                  <p className="mt-0.5 font-body text-xs font-light text-on-surface-variant">
                    {resource.description}
                  </p>
                )}
                {resource.area && (
                  <span className="mt-1 inline-flex items-center gap-1 font-label text-[10px] text-secondary">
                    {resource.area.icon
                      ? <PickedIcon name={resource.area.icon} size={10} />
                      : <TreeStructure size={10} />}
                    {resource.area.title}
                  </span>
                )}
              </Link>

              <Link href={`/${workspaceSlug}/resources/${resource.id}`} className="flex items-center gap-2">
                <div className="text-right">
                  <p className="font-headline text-xl font-light leading-none text-on-surface-variant">
                    {resource._count.notes}
                  </p>
                  <p className="font-label text-[9px] uppercase tracking-widest text-on-surface-variant">
                    {resource._count.notes === 1 ? t.resources.note_one : t.resources.note_other}
                  </p>
                </div>
                <span className="font-body text-sm text-on-surface-variant opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100 group-hover:text-tertiary">
                  →
                </span>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update resources page to use ResourcesView**

In `src/app/(app)/[workspaceSlug]/resources/page.tsx`, replace the inline resource list with `ResourcesView`.

Add the import:
```tsx
import { ResourcesView } from "@/components/resources/ResourcesView";
```

Replace the conditional block (empty state + grid, roughly lines 84-158) with:
```tsx
        <ResourcesView resources={resources} workspaceSlug={workspaceSlug} />
```

Remove unused imports that are now handled by `ResourcesView`: `Books`, `TreeStructure`, `PickedIcon`, `IconPicker`, `Link`, and the `Resource` type import. Keep `ResourceAreaPicker`, `NewResourceButton`, `AttachResourceNotePanel` as they're still used in the page.

- [ ] **Step 3: Verify the build compiles**

```bash
docker compose exec app npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/resources/ResourcesView.tsx src/app/\(app\)/\[workspaceSlug\]/resources/page.tsx
git commit -m "feat(ui): integrate ListFilter into resources page via ResourcesView component"
```

---

### Task 9: Manual Smoke Test

- [ ] **Step 1: Start the dev environment**

```bash
docker compose up -d
```

- [ ] **Step 2: Create test data if needed**

If the database is empty, create a few notes, a project, an area, and a resource through the UI so there's data to search.

- [ ] **Step 3: Test Cmd+K search**

1. Press `Cmd+K` — command palette should open
2. Type a word that exists in a note title — results should appear grouped by type
3. Click a result — should navigate to the correct page
4. Test type filter chips — clicking "Notes" should only show note results
5. Test keyboard navigation — arrow keys should highlight results, Enter should navigate
6. Press `Escape` — palette should close

- [ ] **Step 4: Test list page filters**

1. Go to Projects page — filter input should appear next to the grid/list toggle
2. Type part of a project title — grid should filter instantly
3. Clear the input — all projects should reappear
4. Repeat for Areas and Resources pages

- [ ] **Step 5: Test both locales**

Switch to pt-BR locale and verify all search/filter strings display correctly.

- [ ] **Step 6: Commit any fixes**

If any fixes were needed during smoke testing, commit them.

```bash
git add -u
git commit -m "fix: address smoke test issues in search feature"
```
