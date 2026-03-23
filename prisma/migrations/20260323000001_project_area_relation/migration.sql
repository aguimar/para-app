ALTER TABLE "Project" ADD COLUMN "areaId" TEXT;
CREATE INDEX "Project_areaId_idx" ON "Project"("areaId");
ALTER TABLE "Project" ADD CONSTRAINT "Project_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;
