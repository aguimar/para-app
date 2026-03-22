# Second Brain — PARA

App de organização de conhecimento pessoal baseado na metodologia [PARA](https://fortelabs.com/blog/para/) (Projects, Areas, Resources, Archive).

## Stack

- **Next.js 16** (App Router) + TypeScript
- **tRPC 11** — type-safe API entre cliente e servidor
- **Prisma 7** + PostgreSQL — persistência
- **Clerk** — autenticação
- **BlockNote** — editor de notas estilo Notion (rich text, slash commands, tabelas, listas)
- **@dnd-kit** — drag-and-drop do inbox para categorias PARA
- **Tailwind CSS v4** (CSS-first via `@theme`) + design system próprio
- **Docker Compose** — ambiente de desenvolvimento

## Desenvolvimento

### Pré-requisitos

- Docker + Docker Compose
- Variáveis de ambiente em `.env.local` (Clerk keys, DATABASE_URL)

### Subir o ambiente

```bash
docker compose up -d
```

O app estará disponível em [http://localhost:3000](http://localhost:3000).

### Instalar pacotes

Sempre instale dentro do container para não misturar com o host:

```bash
docker compose exec app npm install <pacote>
docker compose restart app
```

### Banco de dados

```bash
# Rodar migrations
docker compose exec app npx prisma migrate dev

# Abrir Prisma Studio
docker compose exec app npx prisma studio
```

## Estrutura

```
src/
├── app/
│   ├── (app)/              # Rotas autenticadas
│   │   ├── dashboard/      # Inbox + notas recentes
│   │   └── [workspaceSlug]/
│   │       ├── projects/
│   │       ├── areas/
│   │       ├── resources/
│   │       └── archive/
│   ├── note/[id]/          # Editor de nota (BlockNote)
│   └── api/
│       ├── trpc/           # Handler tRPC
│       └── webhooks/       # Clerk webhooks
├── components/
│   ├── notes/              # NoteEditor, NewNoteButton, InboxBoard
│   ├── projects/           # AttachNotePanel
│   ├── resources/          # AttachResourceNotePanel
│   └── ui/                 # NoteCard, ParaBadge, etc.
├── server/
│   └── routers/            # tRPC routers (note, workspace, project…)
└── lib/
    ├── utils.ts            # cn(), bodyToPlainText(), formatRelativeDate()…
    └── trpc.ts             # tRPC client
```

## Editor de notas

O editor usa **BlockNote** com tema customizado integrado ao design system do app.

O conteúdo é armazenado como JSON do BlockNote no campo `body` da tabela `Note`. Notas antigas com HTML são importadas automaticamente na primeira abertura.

Para extrair texto puro do `body` (para previews), use o utilitário:

```ts
import { bodyToPlainText } from "@/lib/utils";

const preview = bodyToPlainText(note.body).slice(0, 120);
```

## Design System

Tailwind v4 com tokens customizados via `@theme` em `src/app/globals.css`. Dark mode ativado por padrão (`class="dark"` no `<html>`).

Fontes: **Manrope** (headlines) + **Inter** (corpo/labels), carregadas via `next/font/google`.

O CSS do BlockNote é carregado via `<link href="/blocknote.css">` no `<head>` para evitar conflitos com o pipeline PostCSS do Tailwind v4.
