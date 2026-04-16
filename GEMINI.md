# GEMINI.md - PARA Second Brain

Instructional context for Gemini CLI in the `para-app` workspace.

## Project Overview

**PARA Second Brain** is a knowledge management application based on the [PARA methodology](https://fortelabs.com/blog/para/) (Projects, Areas, Resources, Archive). It provides a centralized hub for capturing notes, organizing them into actionable categories, and managing projects and resources.

### Tech Stack
- **Frontend:** Next.js 16 (App Router), TypeScript, Tailwind CSS v4 (using `@theme`).
- **Editor:** [BlockNote](https://www.blocknotejs.org/) (rich-text, slash commands).
- **Backend:** tRPC 11 (type-safe API), Prisma 7 (PostgreSQL).
- **Authentication:** Clerk.
- **Interactions:** `@dnd-kit` for drag-and-drop organization.
- **Infrastructure:** Docker Compose for local development.

## Building and Running

### Development Environment
The project is designed to run inside Docker to ensure consistency.

```bash
# Start the development environment
docker compose up -d

# Install new packages (always run inside the container)
docker compose exec app npm install <package_name>
docker compose restart app

# Database migrations
docker compose exec app npx prisma migrate dev

# Open Prisma Studio to inspect data
docker compose exec app npx prisma studio
```

### Local Commands
If running outside Docker (ensure PostgreSQL and environment variables are configured):
- `npm run dev`: Starts the Next.js development server.
- `npm run build`: Builds the application for production.
- `npm run lint`: Runs ESLint for code quality checks.

## Architecture & Conventions

### Directory Structure
- `src/app/`: Next.js App Router pages and layouts.
  - `(app)/`: Authenticated routes (Dashboard, PARA categories).
  - `api/`: API routes (tRPC handler, Webhooks).
- `src/components/`: React components.
  - `ui/`: Reusable design system components (Modal, Button, etc.).
  - `notes/`, `projects/`, etc.: Feature-specific components.
- `src/server/`: Backend logic.
  - `routers/`: tRPC routers defining the API surface.
- `src/lib/`: Shared utility functions and third-party initializations.
- `prisma/`: Database schema and migration files.

### Data Model (Prisma)
- **User:** Synced with Clerk (uses Clerk ID as primary key).
- **Workspace:** Top-level container for all data.
- **Note:** The core entity. Can be in `INBOX` or assigned to a PARA category. Stores content as BlockNote JSON.
- **Project/Area/Resource:** Containers for notes and related metadata.
- **Attachment:** Files linked to notes, stored in the `uploads/` directory.

### Key Conventions
1. **Type Safety:** Always use tRPC for client-server communication. Define input schemas with Zod.
2. **Editor Content:** Note bodies are stored as JSON strings. Use `bodyToPlainText` from `@/lib/utils` for previews.
3. **Styling:** Use Tailwind CSS v4 classes. Custom tokens are defined in `src/app/globals.css`.
4. **Icons:** Use `@phosphor-icons/react` for consistency. Icons are often stored as strings (names) in the database and resolved via `IconPicker` or `icon-registry.tsx`.
5. **Auth:** Protected procedures in tRPC (`protectedProcedure`) ensure the user is authenticated via Clerk.

## Future Tasks & TODOs
- [ ] Implement robust file upload validation in `src/app/api/upload/route.ts`.
- [ ] Enhance "Suggest Category" logic using LLM integration in `src/lib/openrouter.ts`.
- [ ] Add unit tests for tRPC routers using Vitest/Jest.
