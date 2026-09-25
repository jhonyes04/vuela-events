-- AlterTable
ALTER TABLE "events" ADD COLUMN     "seriesId" UUID;

-- CreateIndex
CREATE INDEX "events_seriesId_idx" ON "events"("seriesId");
