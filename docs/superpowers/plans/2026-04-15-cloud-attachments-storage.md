# Cloud Attachments Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move note attachments from local Docker volume storage to a cloud object storage provider, with Cloudflare R2 as the initial target, without breaking existing note attachment UX.

**Architecture:** Introduce a storage adapter boundary in the server layer so attachment upload, read, and delete no longer depend directly on the local filesystem. Keep the `Attachment` table as the metadata source of truth, store provider/object-key information alongside the existing filename fields, and serve downloads through the existing authenticated `/api/files/[id]` route.

**Tech Stack:** Next.js App Router, tRPC, Prisma, PostgreSQL, Cloudflare R2 (S3-compatible API), AWS SDK v3 for S3-compatible object storage.

---

## File Map

- Modify: `src/lib/storage.ts`
  Replace the current filesystem-only helper with a provider-aware storage interface and shared helper types.
- Create: `src/lib/storage/providers/local.ts`
  Preserve current filesystem behavior as the local adapter.
- Create: `src/lib/storage/providers/s3-compatible.ts`
  Implement Cloudflare R2 via S3-compatible SDK calls.
- Create: `src/lib/storage/config.ts`
  Centralize env parsing and provider selection.
- Modify: `src/app/api/upload/route.ts`
  Write uploads through the provider boundary and persist any new attachment metadata fields.
- Modify: `src/app/api/files/[id]/route.ts`
  Read through the provider boundary; keep auth and response headers unchanged.
- Modify: `src/server/routers/attachment.ts`
  Delete attachment blobs through the provider boundary before deleting DB rows.
- Modify: `prisma/schema.prisma`
  Add provider/object-key fields needed for cloud-backed attachments.
- Create: `prisma/migrations/<timestamp>_attachment_storage_provider/migration.sql`
  Apply the schema change.
- Create: `scripts/backfill-attachments-to-r2.ts`
  One-off migration script to upload any surviving local files into the cloud bucket and patch DB metadata.
- Modify: `.env.prod.example`
  Document required production env vars for the storage provider.
- Modify: `CLAUDE.md`
  Update deployment/storage notes so future changes do not regress to ephemeral storage assumptions.
- Create: `docs/attachments-storage-runbook.md`
  Operational runbook for bucket setup, env vars, deploy, verification, and rollback.

## Task 1: Define Attachment Storage Metadata

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_attachment_storage_provider/migration.sql`

- [ ] **Step 1: Add the new attachment fields to the Prisma model**

Use this shape in `Attachment`:

```prisma
model Attachment {
  id              String   @id @default(cuid())
  filename        String
  storedAs        String
  size            Int
  mimeType        String
  noteId          String
  storageProvider String   @default("local")
  storageKey      String?
  storageBucket   String?
  note            Note     @relation(fields: [noteId], references: [id], onDelete: Cascade)
  createdAt       DateTime @default(now())

  @@index([noteId])
  @@index([storageProvider])
}
```

- [ ] **Step 2: Create and inspect the migration**

Run:

```bash
docker compose exec app npx prisma migrate dev --name attachment_storage_provider
```

Expected:
- a new migration folder under `prisma/migrations/`
- Prisma client regenerated successfully

- [ ] **Step 3: Review generated SQL**

Confirm the SQL only:
- adds `storageProvider` with default `'local'`
- adds nullable `storageKey`
- adds nullable `storageBucket`
- adds the supporting index

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations src/generated/prisma
git commit -m "feat: add attachment storage metadata"
```

## Task 2: Introduce a Storage Provider Boundary

**Files:**
- Modify: `src/lib/storage.ts`
- Create: `src/lib/storage/config.ts`
- Create: `src/lib/storage/providers/local.ts`
- Create: `src/lib/storage/providers/s3-compatible.ts`

- [ ] **Step 1: Define the shared storage contract**

Use this interface in `src/lib/storage.ts`:

```ts
export interface StoredObjectRef {
  provider: "local" | "r2";
  key: string;
  bucket?: string;
}

export interface SaveObjectInput {
  buffer: Buffer;
  mimeType: string;
  filename: string;
  key: string;
}

export interface AttachmentStorageProvider {
  save(input: SaveObjectInput): Promise<StoredObjectRef>;
  read(ref: StoredObjectRef): Promise<Buffer>;
  remove(ref: StoredObjectRef): Promise<void>;
}
```

- [ ] **Step 2: Move current filesystem behavior into the local provider**

Implement `src/lib/storage/providers/local.ts` with the current `/app/uploads` logic:

```ts
const UPLOADS_DIR = process.env.UPLOADS_DIR ?? "/app/uploads";
```

The local provider must:
- create the directory recursively on save
- write using `key`
- read using `key`
- swallow missing-file errors on delete just like today

- [ ] **Step 3: Add provider config parsing**

Implement `src/lib/storage/config.ts` to read:

```ts
export const storageConfig = {
  provider: process.env.ATTACHMENTS_STORAGE_PROVIDER ?? "local",
  r2: {
    accountId: process.env.R2_ACCOUNT_ID ?? "",
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
    bucket: process.env.R2_BUCKET ?? "",
    publicBaseUrl: process.env.R2_PUBLIC_BASE_URL ?? "",
  },
};
```

If `provider === "r2"`, validate that the R2 credentials and bucket exist and throw a startup error if they do not.

- [ ] **Step 4: Implement the R2 provider**

Use AWS SDK v3 in `src/lib/storage/providers/s3-compatible.ts`:

```ts
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
```

Rules:
- endpoint: `https://${accountId}.r2.cloudflarestorage.com`
- bucket comes from env
- save returns `{ provider: "r2", key, bucket }`
- read converts the response body stream to `Buffer`
- remove ignores missing-object responses

- [ ] **Step 5: Export a runtime-selected provider**

Expose a single getter in `src/lib/storage.ts`:

```ts
export function getAttachmentStorage(): AttachmentStorageProvider { ... }
```

The rest of the app must stop importing filesystem helpers directly.

- [ ] **Step 6: Commit**

```bash
git add src/lib/storage.ts src/lib/storage/config.ts src/lib/storage/providers
git commit -m "feat: add pluggable attachment storage providers"
```

## Task 3: Wire Upload, Read, and Delete Through the Provider

**Files:**
- Modify: `src/app/api/upload/route.ts`
- Modify: `src/app/api/files/[id]/route.ts`
- Modify: `src/server/routers/attachment.ts`

- [ ] **Step 1: Change upload route to persist provider metadata**

In `src/app/api/upload/route.ts`:
- keep `storedAs` generation as the object key seed
- call `getAttachmentStorage().save(...)`
- persist returned provider metadata into the new attachment fields

Use this creation shape:

```ts
const objectRef = await storage.save({
  buffer,
  mimeType: file.type,
  filename: file.name,
  key: storedAs,
});

const attachment = await db.attachment.create({
  data: {
    filename: file.name,
    storedAs,
    size: file.size,
    mimeType: file.type,
    noteId,
    storageProvider: objectRef.provider,
    storageKey: objectRef.key,
    storageBucket: objectRef.bucket,
  },
});
```

- [ ] **Step 2: Change file-serving route to use provider metadata**

In `src/app/api/files/[id]/route.ts`, replace direct `readFile(attachment.storedAs)` calls with:

```ts
const ref = {
  provider: attachment.storageProvider as "local" | "r2",
  key: attachment.storageKey ?? attachment.storedAs,
  bucket: attachment.storageBucket ?? undefined,
};

buffer = await storage.read(ref);
```

Keep the same auth and response headers.

- [ ] **Step 3: Change deletion to remove the remote object**

In `src/server/routers/attachment.ts`, build the same ref and call storage remove before deleting the row.

- [ ] **Step 4: Manual verification**

Run:

```bash
docker compose exec app npm run lint -- 'src/app/api/upload/route.ts' 'src/app/api/files/[id]/route.ts' 'src/server/routers/attachment.ts'
```

Expected:
- exit code `0`

- [ ] **Step 5: Commit**

```bash
git add src/app/api/upload/route.ts src/app/api/files src/server/routers/attachment.ts
git commit -m "feat: route attachment operations through storage provider"
```

## Task 4: Add R2 Configuration and Operational Docs

**Files:**
- Modify: `.env.prod.example`
- Modify: `CLAUDE.md`
- Create: `docs/attachments-storage-runbook.md`

- [ ] **Step 1: Document the env vars**

Add to `.env.prod.example`:

```env
ATTACHMENTS_STORAGE_PROVIDER=local
UPLOADS_DIR=/app/uploads
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_PUBLIC_BASE_URL=
```

- [ ] **Step 2: Update repo guidance**

In `CLAUDE.md`, replace the line that says attachments are stored on Docker volume only with guidance like:

```md
- Attachments may be stored either on the local Docker volume at `/app/uploads` or in cloud object storage, depending on `ATTACHMENTS_STORAGE_PROVIDER`
```

- [ ] **Step 3: Write the runbook**

Create `docs/attachments-storage-runbook.md` with:
- bucket creation steps in R2
- env var configuration
- deploy order
- smoke test steps
- rollback to `local`
- note that lost historical files cannot be reconstructed without backup

- [ ] **Step 4: Commit**

```bash
git add .env.prod.example CLAUDE.md docs/attachments-storage-runbook.md
git commit -m "docs: add attachment cloud storage runbook"
```

## Task 5: Build a Backfill Script for Surviving Local Files

**Files:**
- Create: `scripts/backfill-attachments-to-r2.ts`

- [ ] **Step 1: Implement a one-off backfill script**

The script should:
- query attachments where `storageProvider = 'local'`
- resolve file path from `storedAs`
- skip rows whose local file is already missing
- upload existing files to R2 using the same provider helper
- patch `storageProvider`, `storageKey`, and `storageBucket`
- emit summary counts: migrated, skipped-missing, failed

Use this execution shape:

```bash
docker compose exec app npx tsx scripts/backfill-attachments-to-r2.ts
```

- [ ] **Step 2: Add dry-run mode**

Support:

```bash
docker compose exec app npx tsx scripts/backfill-attachments-to-r2.ts --dry-run
```

Expected:
- no DB writes
- clear report of how many attachments are recoverable

- [ ] **Step 3: Commit**

```bash
git add scripts/backfill-attachments-to-r2.ts
git commit -m "feat: add attachment backfill script for r2 migration"
```

## Task 6: Production Cutover

**Files:**
- No code changes; this is an ops task using the files above.

- [ ] **Step 1: Create the R2 bucket and credentials**

Create:
- one bucket for app attachments
- one scoped API token with object read/write/delete for that bucket only

- [ ] **Step 2: Set production env vars**

On the server or deployment secret store, set:

```env
ATTACHMENTS_STORAGE_PROVIDER=r2
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=...
```

- [ ] **Step 3: Deploy**

Run the normal deploy flow and wait for success.

- [ ] **Step 4: Smoke test**

Verify:
- upload a PDF from a note
- preview it in modal
- open it in new tab
- delete it
- upload another file and confirm it still exists after a redeploy

- [ ] **Step 5: Optional backfill**

If local files still exist:

```bash
docker compose exec app npx tsx scripts/backfill-attachments-to-r2.ts --dry-run
docker compose exec app npx tsx scripts/backfill-attachments-to-r2.ts
```

- [ ] **Step 6: Rollback plan**

If the provider fails in production:
- set `ATTACHMENTS_STORAGE_PROVIDER=local`
- redeploy
- keep R2 objects untouched
- investigate before attempting cutover again

## Self-Review

- Spec coverage: covers storage boundary, metadata persistence, upload/read/delete flow, env setup, operational docs, and backfill.
- Placeholder scan: no `TODO`/`TBD` placeholders remain; the only variable left is the migration timestamp generated by Prisma.
- Type consistency: `storageProvider`, `storageKey`, and `storageBucket` are used consistently across schema, routes, and script steps.

