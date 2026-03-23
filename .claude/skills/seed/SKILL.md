---
name: seed
description: Seeds the database with initial data. Usage - /seed resources, /seed areas, or /seed all
---

Run the appropriate seed script inside the Docker container.

The DATABASE_URL for the container is `postgresql://para:para@postgres:5432/para`.

- If the argument is `resources` or empty, run:
  `docker compose exec -e DATABASE_URL=postgresql://para:para@postgres:5432/para app npx tsx scripts/seed-resources.ts`

- If the argument is `areas`, run:
  `docker compose exec -e DATABASE_URL=postgresql://para:para@postgres:5432/para app npx tsx scripts/seed-areas.ts`

- If the argument is `all`, run both scripts in sequence.

Report how many records were created or skipped for each script.
