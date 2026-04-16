---
name: dev
description: Starts the local dev environment with Docker Compose. Usage - /dev (start), /dev stop, /dev restart, /dev logs
---

Manage the local development environment via Docker Compose.

- **No argument or `start`**: Run `docker compose up -d` then show container status with `docker compose ps`. Tell the user the app is available at http://localhost:3000.

- **`stop`**: Run `docker compose down`.

- **`restart`**: Run `docker compose restart app` then show status.

- **`logs`**: Run `docker compose logs app --tail 40` to show recent logs.

- **`rebuild`**: Run `docker compose up -d --build app` to rebuild the app image from scratch.

Always show the output so the user can see what happened.
