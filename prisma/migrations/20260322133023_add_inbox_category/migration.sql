-- AlterEnum
ALTER TYPE "ParaCategory" ADD VALUE 'INBOX';

-- AlterTable
ALTER TABLE "Note" ALTER COLUMN "category" SET DEFAULT 'INBOX';
