---
name: migrate
description: Creates and applies a Prisma migration, then restarts the app container. Usage - /migrate <migration-name>
---

Run the following steps in order:

1. Apply the migration (run on host, not inside container):
   `DATABASE_URL=postgresql://para:para@localhost:5432/para npx prisma migrate dev --name <migration-name>`

2. Restart the app container to clear the stale Prisma client cache:
   `docker compose restart app`

3. Report the migration file path that was created and confirm the container restarted successfully.

If no migration name is provided, ask the user for one before proceeding.
