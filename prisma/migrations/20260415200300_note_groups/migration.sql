-- AlterTable
ALTER TABLE "Note" ADD COLUMN "groupId" TEXT;

-- CreateTable
CREATE TABLE "NoteGroup" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Unnamed group',
    "icon" TEXT NOT NULL DEFAULT '',
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NoteGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NoteGroup_workspaceId_idx" ON "NoteGroup"("workspaceId");

-- CreateIndex
CREATE INDEX "Note_groupId_idx" ON "Note"("groupId");

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "NoteGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteGroup" ADD CONSTRAINT "NoteGroup_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
