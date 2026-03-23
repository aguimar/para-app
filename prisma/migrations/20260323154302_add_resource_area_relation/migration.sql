-- AlterTable
ALTER TABLE "Resource" ADD COLUMN     "areaId" TEXT;

-- CreateIndex
CREATE INDEX "Resource_areaId_idx" ON "Resource"("areaId");

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE SET NULL ON UPDATE CASCADE;
