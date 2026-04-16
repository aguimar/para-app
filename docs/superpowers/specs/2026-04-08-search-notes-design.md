# Search Notes & Containers

**Date:** 2026-04-08
**Status:** Approved

## Overview

Add full-text search across notes, projects, areas, and resources. Two UIs: a global command palette (`Cmd+K`) backed by Postgres full-text search, and client-side filter inputs on list pages.

## Decisions

| Decision | Choice | Alternatives considered |
|---|---|---|
| Search scope | Notes + containers (projects, areas, resources) | Notes only; everything including comments/attachments |
| Search UI | Command palette (`Cmd+K`) + list page filter inputs | Persistent search bar only; command palette only |
| Search engine | Postgres full-text search (`tsvector`/`tsquery`) | Simple `ILIKE` substring; client-side Fuse.js |
| Architecture | Single unified `search.search` tRPC procedure | Per-entity procedures with client merge; DB view |
| Result selection | Navigate to item | Navigate + highlight match in body; preview panel |
| Result filtering | Type filter chips (All/Notes/Projects/Areas/Resources) | No filters; type + category + status filters |
| List page filter | Client-side substring on loaded data | Reuse Postgres full-text search backend |
| Text search config | `'simple'` (language-agnostic) | `'portuguese'`; `'english'` |

## 1. Database: Full-Text Search Indexes

A Prisma migration adds `tsvector` columns and GIN indexes via raw SQL to four tables.

### Notes

A generated `search_vector` column combining:
- `title` (weight A)
- Plain-text-extracted `body` (weight B) — BlockNote JSON text nodes extracted via `jsonb_path_query_array`
- `tags` joined as text (weight C)

Updated via a trigger on INSERT/UPDATE.

### Projects, Areas, Resources

A simpler `search_vector` from:
- `title` (weight A)
- `description` (weight B)

Same trigger pattern.

### Language config

`'simple'` (language-agnostic) since content is mixed Portuguese/English. Avoids stemming issues across languages while supporting prefix matching.

## 2. Backend: Unified Search Procedure

New file: `src/server/routers/search.ts`, registered in `src/server/routers/index.ts`.

### Procedure: `search.search`

**Input:**
- `workspaceId` — string, required
- `query` — string, min 1 char, required
- `type` — optional enum: `"note" | "project" | "area" | "resource"`
- `limit` — number, default 20

**Implementation:**
- Workspace ownership verified before query (same pattern as other routers)
- `ctx.db.$queryRaw` with a SQL `UNION ALL` across the four tables
- `plainto_tsquery('simple', $input)` for safe query parsing
- `ts_rank(search_vector, query)` for relevance ordering
- `ts_headline('simple', title, query)` for match highlighting with `<mark>` tags
- If `type` filter is provided, only that table's subquery runs
- Results ordered by `rank DESC`, limited by `limit`

**Return type:**
```ts
{
  id: string;
  title: string;
  type: "note" | "project" | "area" | "resource";
  icon: string;
  category: string | null;
  headline: string;
  rank: number;
}[]
```

## 3. Frontend: Command Palette

New component: `src/components/CommandPalette.tsx`, mounted once in `src/app/(app)/layout.tsx`.

### Trigger
- `Cmd+K` (Mac) / `Ctrl+K` (Windows) toggles the modal
- Escape or clicking outside closes it

### UI structure
- Modal overlay with backdrop blur
- Text input at top, auto-focused on open
- Type filter chips below input: All, Notes, Projects, Areas, Resources (toggleable, default "All")
- Results grouped by type with section headers
- Each result shows: icon, title with highlighted matches (from `ts_headline`), type/category badge

### Behavior
- Debounced input (300ms) triggers `trpc.search.search`
- Keyboard navigation: arrow keys between results, Enter to select
- Selecting navigates to the item's page and closes the palette
- Loading spinner during request
- Empty state: "No results for _query_"

### Navigation targets
- Note: `/${workspaceSlug}/notes/${id}`
- Project: `/${workspaceSlug}/projects/${id}`
- Area: `/${workspaceSlug}/areas/${id}`
- Resource: `/${workspaceSlug}/resources/${id}`

### Styling
- `bg-surface-container-low`, `rounded-xl`, `shadow-ambient`
- Consistent with sidebar/card aesthetic
- Backdrop overlay with slight blur

## 4. Frontend: List Page Filter Inputs

New reusable component: `src/components/ListFilter.tsx`.

### Where it appears
- `/${workspaceSlug}/projects` — filters project cards
- `/${workspaceSlug}/areas` — filters area cards
- `/${workspaceSlug}/resources` — filters resource cards
- Container detail pages (e.g., a project's notes list) — filters notes within that container

### Behavior
- Small search input at top of each list, next to existing action buttons
- Client-side case-insensitive substring match on `title`
- Instant filtering, no debounce (operates on loaded data only)
- Clearing input restores full list
- Empty state: "No matches"
- Phosphor `MagnifyingGlass` icon as input prefix

### Scope
Filters only items currently loaded on the page (up to pagination limit). Full search is handled by the command palette.

## 5. i18n

New keys in both `en-US.json` and `pt-BR.json`:

| Key | en-US | pt-BR |
|---|---|---|
| `search.placeholder` | Search... | Buscar... |
| `search.noResults` | No results for | Nenhum resultado para |
| `search.typeAll` | All | Todos |
| `search.typeNotes` | Notes | Notas |
| `search.typeProjects` | Projects | Projetos |
| `search.typeAreas` | Areas | Áreas |
| `search.typeResources` | Resources | Recursos |
| `search.hint` | ⌘K to search | ⌘K para buscar |
| `listFilter.placeholder` | Filter... | Filtrar... |
| `listFilter.noMatches` | No matches | Nenhuma correspondência |
