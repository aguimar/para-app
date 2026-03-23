-- Set INBOX as default now that the enum value is committed from the previous migration
ALTER TABLE "Note" ALTER COLUMN "category" SET DEFAULT 'INBOX';

ALTER TABLE "Resource" ADD COLUMN "icon" TEXT NOT NULL DEFAULT '';
