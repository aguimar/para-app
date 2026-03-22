-- CreateEnum
CREATE TYPE "ProjectPriority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "priority" "ProjectPriority" NOT NULL DEFAULT 'MEDIUM';
