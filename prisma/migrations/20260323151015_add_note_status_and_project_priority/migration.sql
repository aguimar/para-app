-- CreateEnum
CREATE TYPE "NoteStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');

-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "status" "NoteStatus" NOT NULL DEFAULT 'TODO';
