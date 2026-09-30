/*
  Warnings:

  - Added the required column `guideId` to the `events` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "events" ADD COLUMN     "guideId" UUID NOT NULL;

-- CreateIndex
CREATE INDEX "events_guideId_idx" ON "events"("guideId");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "guides"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
