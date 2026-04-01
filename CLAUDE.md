# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Important:** Next.js 16 has breaking changes. Read `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

## Dev Environment

All commands run inside Docker — never on the host.

```bash
/dev                                          # start (or: /dev stop, /dev restart, /dev logs)
docker compose exec app npm install <pkg>     # add a package, then restart
docker compose restart app                    # apply env/config changes
```

```bash
/migrate <name>                               # create & apply Prisma migration, restart app
docker compose exec app npx prisma studio     # open DB GUI
/seed resources | /seed areas | /seed all     # seed initial data
```

```bash
/i18n-check [path]   # audit hardcoded strings vs dictionaries
/gen-test <file>     # generate tests for a tRPC router or component
```

Build & lint (inside container):
```bash
docker compose exec app npm run build
docker compose exec app npx eslint --fix src/
```

## Architecture

**Full-stack Next.js (App Router) + tRPC + Prisma + PostgreSQL + Clerk**

### Request flow

Client component → `src/lib/trpc.ts` (tRPC client) → `/api/trpc` → `src/server/routers/index.ts` (merged router) → individual router files in `src/server/routers/` → `src/server/db.ts` (Prisma singleton)

All tRPC procedures are `protectedProcedure` — they require a valid Clerk session and expose `ctx.userId`. Workspace ownership is verified inside each router before any DB mutation.

### Data model (PARA)

`User (Clerk ID) → Workspace → { Project, Area, Resource, Note }`

- Notes belong to a Workspace and optionally to one of: Project, Area, or Resource
- Notes carry a `ParaCategory` enum (INBOX / PROJECT / AREA / RESOURCE / ARCHIVE) for filtering
- Notes support self-referential backlinks (`Note.backlinks` / `Note.linkedFrom`)
- Attachments cascade-delete with their Note; files stored on Docker volume at `/app/uploads`

### Key directories

| Path | Purpose |
|---|---|
| `src/app/(app)/[workspaceSlug]/` | Authenticated workspace routes (projects, areas, resources, archive) |
| `src/app/api/webhooks/` | Clerk user sync + Evolution API (WhatsApp → Inbox) |
| `src/server/routers/` | tRPC route handlers — one file per domain |
| `src/components/notes/` | NoteEditor (BlockNote), NoteCard, InboxBoard |
| `src/lib/utils.ts` | `cn()`, `bodyToPlainText()`, formatting helpers |
| `src/lib/openrouter.ts` | AI calls (title generation, task suggestions, PARA categorisation) |
| `src/dictionaries/` | i18n strings — `en-US.json` and `pt-BR.json` |
| `src/generated/prisma/` | Generated Prisma client — never edit manually |
| `prisma/schema.prisma` | Source of truth for the DB schema |

### Styling

Tailwind v4 CSS-first — all design tokens are `@theme` blocks in `src/app/globals.css`. There is no `tailwind.config.ts` with theme extensions. Fonts: **Manrope** (headings) + **Inter** (body). Dark mode is default (`class="dark"` on `<html>`). Use `cn()` from `src/lib/utils.ts` for all className composition.

### Rich-text editor

BlockNote (`@blocknote/react`) stores content as JSON in `Note.body`. `bodyToPlainText()` converts it to plain text for previews and search. The BlockNote stylesheet is loaded via `<link>` tag (not imported), pointing to `/blocknote.css` in `public/`.

### AI integration

`src/lib/openrouter.ts` wraps OpenRouter for lightweight generative tasks (note titles from WhatsApp messages, project task suggestions, PARA category suggestions). Uses `claude-haiku-4-5-20251001` by default.

### i18n

Locale is read from a cookie via `src/lib/get-locale.ts`. Components consume the dictionary through `DictionaryProvider`. Always add new user-visible strings to both `en-US.json` and `pt-BR.json`; run `/i18n-check` to catch regressions.

### Deployment

GitHub Actions (`.github/workflows/deploy.yml`) builds a multi-stage Docker image on push to `main` and SSH-deploys via `docker-compose.prod.yml`. The Prisma client is generated at build time inside the Docker builder stage.
