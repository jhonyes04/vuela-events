-- AlterTable
ALTER TABLE "events" ADD COLUMN     "guideId" UUID;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "guides"("id") ON DELETE SET NULL ON UPDATE CASCADE;
