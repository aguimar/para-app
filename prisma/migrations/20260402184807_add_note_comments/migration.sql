-- CreateTable
CREATE TABLE "NoteComment" (
    "id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NoteComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NoteComment_noteId_idx" ON "NoteComment"("noteId");

-- AddForeignKey
ALTER TABLE "NoteComment" ADD CONSTRAINT "NoteComment_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;
