ALTER TABLE "NoteGroup"
ADD COLUMN "category" "ParaCategory" NOT NULL DEFAULT 'INBOX';

CREATE INDEX "NoteGroup_category_idx" ON "NoteGroup"("category");
