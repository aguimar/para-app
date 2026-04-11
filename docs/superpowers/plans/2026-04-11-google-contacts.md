# Google Contacts Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to connect their Google account and mention contacts inline in notes via `@`, with contacts listed in the note inspector sidebar.

**Architecture:** Google OAuth tokens stored on the User model. A `contacts.search` tRPC procedure calls the Google People API in real time. BlockNote uses a custom `mention` inline content spec triggered by `@`. On save, contacts are extracted from the block JSON and persisted in `Note.contacts`.

**Tech Stack:** Next.js App Router, tRPC, Prisma/PostgreSQL, BlockNote 0.29, googleapis npm package, Clerk auth.

---

### Task 1: Schema additions + migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add Google token fields to User and contacts field to Note**

In `prisma/schema.prisma`, add to the `User` model (after `imageUrl`):

```prisma
  googleAccessToken  String?
  googleRefreshToken String?
  googleTokenExpiry  DateTime?
```

Add to the `Note` model (after `tags`):

```prisma
  contacts    Json         @default("[]")
```

- [ ] **Step 2: Create and apply migration**

```bash
docker compose exec app npx prisma migrate dev --name add_google_contacts
```

Expected: migration file created, DB schema updated, Prisma client regenerated.

- [ ] **Step 3: Verify Prisma client was regenerated**

```bash
docker compose exec app npx prisma generate
```

Expected: "Generated Prisma client" message, no errors.

- [ ] **Step 4: Commit**

```bash
git add prisma/ src/generated/
git commit -m "feat: add google oauth fields to User and contacts field to Note"
```

---

### Task 2: Install googleapis package + env vars

**Files:**
- Modify: `.env.local` (dev, not committed)
- Modify: `.env.prod` (production server, not committed)

- [ ] **Step 1: Install googleapis inside the container**

```bash
docker compose exec app npm install googleapis
docker compose restart app
```

Expected: `googleapis` appears in `package.json` dependencies, container restarts cleanly.

- [ ] **Step 2: Add env vars to `.env.local`**

Add these three lines to `.env.local`:

```
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

To get these values: go to [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials → Create OAuth 2.0 Client ID (Web application). Add `http://localhost:3000/api/auth/google/callback` as authorized redirect URI. Enable the "People API" in the project.

- [ ] **Step 3: Add env vars to production (on the server)**

On the production server, add to `.env.prod`:

```
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/google/callback
```

The production redirect URI must also be added to the Google Cloud Console OAuth app's authorized redirect URIs.

- [ ] **Step 4: Commit package.json changes**

```bash
git add package.json package-lock.json
git commit -m "chore: add googleapis dependency"
```

---

### Task 3: Google OAuth API routes

**Files:**
- Create: `src/app/api/auth/google/route.ts`
- Create: `src/app/api/auth/google/callback/route.ts`

- [ ] **Step 1: Create the redirect route**

Create `src/app/api/auth/google/route.ts`:

```typescript
import { google } from "googleapis";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", process.env.GOOGLE_REDIRECT_URI!.replace("/api/auth/google/callback", "")));
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/contacts.readonly"],
    prompt: "consent",
  });

  return NextResponse.redirect(url);
}
```

- [ ] **Step 2: Create the callback route**

Create `src/app/api/auth/google/callback/route.ts`:

```typescript
import { google } from "googleapis";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { NextRequest, NextResponse } from "next/server";

const appUrl = () =>
  process.env.GOOGLE_REDIRECT_URI!.replace("/api/auth/google/callback", "");

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", appUrl()));
  }

  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/settings?google=error", appUrl()));
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  const { tokens } = await oauth2Client.getToken(code);

  await db.user.update({
    where: { id: userId },
    data: {
      googleAccessToken: tokens.access_token ?? null,
      googleRefreshToken: tokens.refresh_token ?? null,
      googleTokenExpiry: tokens.expiry_date
        ? new Date(tokens.expiry_date)
        : null,
    },
  });

  return NextResponse.redirect(new URL("/settings?google=connected", appUrl()));
}
```

- [ ] **Step 3: Verify routes are reachable**

```bash
docker compose exec app curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/auth/google
```

Expected: `307` (redirect to Google OAuth URL, even without real credentials).

- [ ] **Step 4: Commit**

```bash
git add src/app/api/auth/google/
git commit -m "feat: add google oauth redirect and callback routes"
```

---

### Task 4: contacts tRPC router

**Files:**
- Create: `src/server/routers/contacts.ts`
- Modify: `src/server/routers/index.ts`

- [ ] **Step 1: Create the contacts router**

Create `src/server/routers/contacts.ts`:

```typescript
import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { google } from "googleapis";
import { TRPCError } from "@trpc/server";

async function makeOAuth2Client(
  accessToken: string,
  refreshToken: string | null,
  expiry: Date | null,
  userId: string,
  db: any
) {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken ?? undefined,
    expiry_date: expiry?.getTime(),
  });

  // Auto-refresh if expired
  if (expiry && expiry < new Date()) {
    const { credentials } = await client.refreshAccessToken();
    await db.user.update({
      where: { id: userId },
      data: {
        googleAccessToken: credentials.access_token ?? null,
        googleTokenExpiry: credentials.expiry_date
          ? new Date(credentials.expiry_date)
          : null,
      },
    });
    client.setCredentials(credentials);
  }

  return client;
}

export const contactsRouter = router({
  search: protectedProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.userId },
        select: {
          googleAccessToken: true,
          googleRefreshToken: true,
          googleTokenExpiry: true,
        },
      });

      if (!user?.googleAccessToken) return [];

      try {
        const auth = await makeOAuth2Client(
          user.googleAccessToken,
          user.googleRefreshToken,
          user.googleTokenExpiry,
          ctx.userId,
          ctx.db
        );

        const people = google.people({ version: "v1", auth });
        const res = await people.people.searchContacts({
          query: input.query,
          readMask: "names,emailAddresses,photos",
          pageSize: 10,
        });

        return (res.data.results ?? [])
          .map((r) => {
            const person = r.person!;
            return {
              googleId: person.resourceName ?? "",
              name: person.names?.[0]?.displayName ?? "",
              email: person.emailAddresses?.[0]?.value ?? "",
              photoUrl: person.photos?.[0]?.url ?? "",
            };
          })
          .filter((c) => c.googleId && c.email);
      } catch {
        return [];
      }
    }),

  disconnect: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db.user.update({
      where: { id: ctx.userId },
      data: {
        googleAccessToken: null,
        googleRefreshToken: null,
        googleTokenExpiry: null,
      },
    });
  }),
});
```

- [ ] **Step 2: Register in the merged router**

In `src/server/routers/index.ts`, add:

```typescript
import { contactsRouter } from "./contacts";
```

And inside `appRouter`:

```typescript
contacts: contactsRouter,
```

Full file after edits:

```typescript
import { router } from "../trpc";
import { workspaceRouter } from "./workspace";
import { projectRouter } from "./project";
import { areaRouter } from "./area";
import { resourceRouter } from "./resource";
import { archiveRouter } from "./archive";
import { noteRouter } from "./note";
import { attachmentRouter } from "./attachment";
import { userRouter } from "./user";
import { commentRouter } from "./comment";
import { searchRouter } from "./search";
import { contactsRouter } from "./contacts";

export const appRouter = router({
  user: userRouter,
  workspace: workspaceRouter,
  project: projectRouter,
  area: areaRouter,
  resource: resourceRouter,
  archive: archiveRouter,
  note: noteRouter,
  attachment: attachmentRouter,
  comment: commentRouter,
  search: searchRouter,
  contacts: contactsRouter,
});

export type AppRouter = typeof appRouter;
```

- [ ] **Step 3: Verify the app compiles**

```bash
docker compose exec app npm run build 2>&1 | tail -5
```

Expected: no TypeScript errors related to contacts router.

- [ ] **Step 4: Commit**

```bash
git add src/server/routers/contacts.ts src/server/routers/index.ts
git commit -m "feat: add contacts tRPC router with google people api search"
```

---

### Task 5: i18n strings

**Files:**
- Modify: `src/dictionaries/en-US.json`
- Modify: `src/dictionaries/pt-BR.json`

- [ ] **Step 1: Add strings to en-US.json**

Inside the `"noteEditor"` object, after `"created": "Created"`, add:

```json
"contacts": "Contacts",
"noContacts": "No contacts mentioned yet."
```

Inside the `"settings"` object, after the last existing key, add:

```json
"googleIntegration": "Google Contacts",
"googleDescription": "Connect your Google account to mention contacts in notes with @.",
"googleConnect": "Connect Google",
"googleConnected": "Connected",
"googleDisconnect": "Disconnect"
```

- [ ] **Step 2: Add strings to pt-BR.json**

Same locations in `pt-BR.json`:

In `"noteEditor"`:
```json
"contacts": "Contatos",
"noContacts": "Nenhum contato mencionado ainda."
```

In `"settings"`:
```json
"googleIntegration": "Google Contatos",
"googleDescription": "Conecte sua conta Google para mencionar contatos nas notas com @.",
"googleConnect": "Conectar Google",
"googleConnected": "Conectado",
"googleDisconnect": "Desconectar"
```

- [ ] **Step 3: Verify i18n check passes**

```bash
docker compose exec app /i18n-check src/
```

Expected: no missing key warnings.

- [ ] **Step 4: Commit**

```bash
git add src/dictionaries/
git commit -m "feat: add i18n strings for google contacts and note contacts section"
```

---

### Task 6: user.me — add isGoogleConnected + Settings page Google section

**Files:**
- Modify: `src/server/routers/user.ts`
- Modify: `src/app/(app)/settings/page.tsx`

- [ ] **Step 1: Add isGoogleConnected to user.me**

In `src/server/routers/user.ts`, update the `me` procedure's `select` to include `googleAccessToken`:

```typescript
me: protectedProcedure.query(async ({ ctx }) => {
  const user = await ctx.db.user.findUnique({
    where: { id: ctx.userId },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      imageUrl: true,
      googleAccessToken: true,
    },
  });
  if (!user) return null;
  return {
    ...user,
    isGoogleConnected: !!user.googleAccessToken,
    googleAccessToken: undefined, // don't expose token to client
  };
}),
```

- [ ] **Step 2: Add Google section to Settings page**

In `src/app/(app)/settings/page.tsx`:

Add import at the top:

```typescript
import { GoogleLogo } from "@phosphor-icons/react";
```

Inside `SettingsPage`, add after the `updatePhone` mutation line:

```typescript
const disconnectGoogle = trpc.contacts.disconnect.useMutation({
  onSuccess: () => utils.user.me.invalidate(),
});
const utils = trpc.useUtils();
```

Add this section after the closing `</section>` of the WhatsApp section (before the closing `</div>` of the `max-w-2xl` div):

```tsx
{/* Google Contacts Integration */}
<section className="rounded-xl bg-surface-container-lowest p-6 shadow-[0_12px_40px_rgba(42,52,57,0.06)] space-y-6">
  <div className="flex items-center gap-3">
    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
      <GoogleLogo size={22} weight="fill" className="text-blue-400" />
    </div>
    <div>
      <h2 className="font-headline text-base font-bold text-on-surface">
        {labels.googleIntegration ?? "Google Contacts"}
      </h2>
      <p className="font-body text-xs text-on-surface-variant">
        {labels.googleDescription ?? "Connect your Google account to mention contacts in notes with @."}
      </p>
    </div>
  </div>

  {user?.isGoogleConnected ? (
    <div className="flex items-center justify-between rounded-xl bg-surface-container px-4 py-3">
      <span className="font-label text-xs font-semibold text-green-400">
        ✓ {labels.googleConnected ?? "Connected"}
      </span>
      <button
        onClick={() => disconnectGoogle.mutate()}
        disabled={disconnectGoogle.isPending}
        className="font-label text-[11px] font-bold uppercase tracking-widest text-on-surface-variant hover:text-error transition-colors disabled:opacity-50"
      >
        {labels.googleDisconnect ?? "Disconnect"}
      </button>
    </div>
  ) : (
    <a
      href="/api/auth/google"
      className="inline-flex items-center gap-2 rounded-xl bg-blue-500/10 px-5 py-2.5 font-label text-xs font-bold uppercase tracking-widest text-blue-400 hover:bg-blue-500/20 transition-colors"
    >
      <GoogleLogo size={14} />
      {labels.googleConnect ?? "Connect Google"}
    </a>
  )}
</section>
```

Update the `labels` object to include the new keys:

```typescript
const labels = t.settings ?? {
  title: "Settings",
  whatsappIntegration: "WhatsApp Integration",
  whatsappDescription: "Connect your WhatsApp number to capture notes by sending messages to yourself.",
  phoneLabel: "WhatsApp Number",
  phonePlaceholder: "e.g. 5585988645679",
  phoneHint: "Country code + number, digits only.",
  save: "Save",
  saved: "Saved!",
  googleIntegration: "Google Contacts",
  googleDescription: "Connect your Google account to mention contacts in notes with @.",
  googleConnect: "Connect Google",
  googleConnected: "Connected",
  googleDisconnect: "Disconnect",
};
```

- [ ] **Step 3: Verify settings page renders without errors**

```bash
docker compose logs app --tail=20
```

Expected: no runtime errors after navigating to `/settings`.

- [ ] **Step 4: Commit**

```bash
git add src/server/routers/user.ts src/app/(app)/settings/page.tsx
git commit -m "feat: add google contacts section to settings page"
```

---

### Task 7: note.update — add contacts field + extractContactsFromBody utility

**Files:**
- Modify: `src/server/routers/note.ts`
- Modify: `src/lib/utils.ts`

- [ ] **Step 1: Add extractContactsFromBody to utils.ts**

In `src/lib/utils.ts`, add at the end of the file:

```typescript
export type NoteContact = {
  googleId: string;
  name: string;
  email: string;
};

export function extractContactsFromBody(bodyJson: string): NoteContact[] {
  try {
    const blocks = JSON.parse(bodyJson);
    if (!Array.isArray(blocks)) return [];

    const contacts: NoteContact[] = [];
    const seen = new Set<string>();

    function walkInline(node: any) {
      if (
        node?.type === "mention" &&
        typeof node.props?.googleId === "string" &&
        node.props.googleId
      ) {
        if (!seen.has(node.props.googleId)) {
          seen.add(node.props.googleId);
          contacts.push({
            googleId: node.props.googleId,
            name: node.props.name ?? "",
            email: node.props.email ?? "",
          });
        }
      }
    }

    function walkBlock(block: any) {
      if (Array.isArray(block.content)) block.content.forEach(walkInline);
      if (Array.isArray(block.children)) block.children.forEach(walkBlock);
    }

    blocks.forEach(walkBlock);
    return contacts;
  } catch {
    return [];
  }
}
```

- [ ] **Step 2: Add contacts to note.update input schema**

In `src/server/routers/note.ts`, in the `update` procedure's `.input(z.object({...}))`, add after `resourceId`:

```typescript
contacts: z
  .array(
    z.object({
      googleId: z.string(),
      name: z.string(),
      email: z.string(),
    })
  )
  .optional(),
```

No other changes needed — Prisma accepts `contacts` as a `Json` field and `{ id, ...data }` spread will include it automatically.

- [ ] **Step 3: Verify the build compiles**

```bash
docker compose exec app npm run build 2>&1 | tail -5
```

Expected: no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/utils.ts src/server/routers/note.ts
git commit -m "feat: add contacts field to note.update and extractContactsFromBody utility"
```

---

### Task 8: BlockNote @mention custom inline content

**Files:**
- Create: `src/components/notes/MentionInlineContent.tsx`
- Modify: `src/components/notes/NoteEditor.tsx`

- [ ] **Step 1: Create the Mention inline content spec**

Create `src/components/notes/MentionInlineContent.tsx`:

```typescript
"use client";

import { createReactInlineContentSpec } from "@blocknote/react";
import { BlockNoteSchema, defaultInlineContentSpecs } from "@blocknote/core";

export const Mention = createReactInlineContentSpec(
  {
    type: "mention" as const,
    propSchema: {
      googleId: { default: "" },
      name: { default: "" },
      email: { default: "" },
      photoUrl: { default: "" },
    },
    content: "none",
  },
  {
    render: (props) => (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          background: "rgba(130,100,255,0.18)",
          color: "#a98eff",
          borderRadius: "6px",
          padding: "1px 7px",
          fontSize: "0.875em",
          fontWeight: 500,
          cursor: "default",
        }}
      >
        {props.inlineContent.props.photoUrl && (
          <img
            src={props.inlineContent.props.photoUrl}
            alt=""
            style={{ width: 14, height: 14, borderRadius: "50%" }}
          />
        )}
        @{props.inlineContent.props.name}
      </span>
    ),
  }
);

export const mentionSchema = BlockNoteSchema.create({
  inlineContentSpecs: {
    ...defaultInlineContentSpecs,
    mention: Mention,
  },
});

export type MentionSchema = typeof mentionSchema;
```

- [ ] **Step 2: Rewrite NoteEditor to use the custom schema + SuggestionMenuController**

Replace the full contents of `src/components/notes/NoteEditor.tsx` with:

```typescript
"use client";

import { useEffect, useMemo } from "react";
import { useCreateBlockNote, SuggestionMenuController, getDefaultReactSlashMenuItems } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import type { Block } from "@blocknote/core";
import dynamic from "next/dynamic";
import { mentionSchema } from "./MentionInlineContent";
import { trpc } from "@/lib/trpc";

interface NoteEditorProps {
  noteId?: string;
  content: string;
  onChange: (json: string) => void;
  placeholder?: string;
}

function parseContent(raw: string): Block[] | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as Block[];
  } catch {
    // legacy HTML
  }
  return undefined;
}

function NoteEditorInner({ noteId = "", content, onChange }: NoteEditorProps) {
  const initialContent = useMemo(() => parseContent(content) as any, []);
  const utils = trpc.useUtils();

  const uploadFile = useMemo(
    () => async (file: File): Promise<string> => {
      const form = new FormData();
      form.append("file", file);
      form.append("noteId", noteId);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      return `/api/files/${data.id}`;
    },
    [noteId]
  );

  const editor = useCreateBlockNote({ schema: mentionSchema, initialContent, uploadFile });

  // Import legacy HTML content on first mount
  useEffect(() => {
    if (!content || parseContent(content)) return;
    editor.tryParseHTMLToBlocks(content).then((blocks) => {
      editor.replaceBlocks(editor.document, blocks);
    });
  }, []);

  return (
    <BlockNoteView
      editor={editor}
      theme="light"
      onChange={() => onChange(JSON.stringify(editor.document))}
    >
      <SuggestionMenuController
        triggerCharacter="@"
        getItems={async (query) => {
          if (!query) return [];
          try {
            const results = await utils.contacts.search.fetch({ query });
            return results.map((contact) => ({
              title: contact.name,
              subtext: contact.email,
              badge: undefined,
              aliases: [contact.email],
              group: "Contacts",
              icon: contact.photoUrl ? (
                <img
                  src={contact.photoUrl}
                  alt=""
                  style={{ width: 20, height: 20, borderRadius: "50%" }}
                />
              ) : (
                <span
                  style={{
                    display: "inline-flex",
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: "rgba(130,100,255,0.3)",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    color: "#a98eff",
                    fontWeight: 700,
                  }}
                >
                  {contact.name.charAt(0).toUpperCase()}
                </span>
              ),
              onItemClick: () => {
                editor.insertInlineContent([
                  {
                    type: "mention",
                    props: {
                      googleId: contact.googleId,
                      name: contact.name,
                      email: contact.email,
                      photoUrl: contact.photoUrl ?? "",
                    },
                  },
                  " ",
                ]);
              },
            }));
          } catch {
            return [];
          }
        }}
      />
    </BlockNoteView>
  );
}

export const NoteEditor = dynamic(
  () => Promise.resolve(NoteEditorInner),
  { ssr: false }
);
```

- [ ] **Step 3: Verify the editor renders without errors**

Start dev server and open any note. Confirm:
- Editor loads normally
- Typing `@` followed by a name shows the suggestion menu (if Google is connected) or shows empty state (if not connected)
- Selecting a contact inserts the mention chip inline

```bash
docker compose logs app --tail=30
```

Expected: no console errors about BlockNote schema.

- [ ] **Step 4: Commit**

```bash
git add src/components/notes/MentionInlineContent.tsx src/components/notes/NoteEditor.tsx
git commit -m "feat: add blocknote @mention custom inline content for google contacts"
```

---

### Task 9: NoteEditorPage — save contacts + inspector contacts section

**Files:**
- Modify: `src/app/note/[id]/page.tsx`

- [ ] **Step 1: Import extractContactsFromBody**

At the top of `src/app/note/[id]/page.tsx`, add to existing imports:

```typescript
import { extractContactsFromBody, type NoteContact } from "@/lib/utils";
```

- [ ] **Step 2: Add contacts state**

After the existing state declarations (after `setSuggestion` line), add:

```typescript
const [contacts, setContacts] = useState<NoteContact[]>([]);
```

- [ ] **Step 3: Initialize contacts from note**

Inside the `useEffect` that initializes from `note` (the one with `initializedId !== params.id` check), add after setting `setStartDate`:

```typescript
const noteContacts = Array.isArray((note as any).contacts)
  ? (note as any).contacts as NoteContact[]
  : [];
setContacts(noteContacts);
```

- [ ] **Step 4: Extract and save contacts in save()**

Inside the `save` callback, update the `updateNote.mutateAsync` call to include `contacts`. Change:

```typescript
await updateNote.mutateAsync({
  id: params.id,
  title,
  body,
  category,
  projectId:  category === "PROJECT"  ? projectId  : null,
  areaId:     category === "AREA"     ? undefined  : null,
  resourceId: category === "RESOURCE" ? resourceId : null,
  dueDate:    category === "PROJECT" && dueDate   ? new Date(dueDate)   : null,
  startDate:  category === "PROJECT" && startDate ? new Date(startDate) : null,
});
```

To:

```typescript
const extractedContacts = extractContactsFromBody(body);
await updateNote.mutateAsync({
  id: params.id,
  title,
  body,
  category,
  contacts: extractedContacts,
  projectId:  category === "PROJECT"  ? projectId  : null,
  areaId:     category === "AREA"     ? undefined  : null,
  resourceId: category === "RESOURCE" ? resourceId : null,
  dueDate:    category === "PROJECT" && dueDate   ? new Date(dueDate)   : null,
  startDate:  category === "PROJECT" && startDate ? new Date(startDate) : null,
});
setContacts(extractedContacts);
```

- [ ] **Step 5: Add contacts section to inspectorContent**

In the `inspectorContent` JSX, add a contacts section after the Tags section and before the Backlinks section:

```tsx
{/* Contacts */}
{contacts.length > 0 && (
  <div>
    <p className="font-label text-[11px] font-semibold uppercase tracking-widest text-on-surface-variant mb-3">
      {t.noteEditor.contacts ?? "Contacts"}
    </p>
    <div className="space-y-1.5">
      {contacts.map((contact) => (
        <div
          key={contact.googleId}
          className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 bg-surface-container"
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "rgba(130,100,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 700,
              color: "#a98eff",
              flexShrink: 0,
            }}
          >
            {contact.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-headline text-xs font-semibold text-on-surface truncate">
              {contact.name}
            </p>
            <p className="font-body text-[10px] text-on-surface-variant truncate">
              {contact.email}
            </p>
          </div>
        </div>
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 6: End-to-end smoke test**

1. Open a note
2. Type `@` followed by a contact name (requires Google connected in Settings)
3. Select a contact from the popover
4. Press Cmd+S to save
5. Toggle inspector open — confirm the contact appears in the Contacts section
6. Reload the page — confirm contact persists

- [ ] **Step 7: Commit**

```bash
git add src/app/note/\[id\]/page.tsx
git commit -m "feat: extract and persist contacts from note body, show in inspector sidebar"
```

---

## Self-review checklist

- [x] Spec coverage: OAuth flow (Tasks 2–3), contacts search (Task 4), i18n (Task 5), settings UI (Task 6), schema (Task 1), @mention (Task 8), extraction (Task 7), inspector (Task 9) — all requirements covered.
- [x] No placeholders — all steps have full code.
- [x] Type consistency: `NoteContact` defined in Task 7 and imported in Task 9. `mentionSchema`/`MentionSchema` defined in Task 8. `contacts.search` registered in Task 4 and used in Task 8.
