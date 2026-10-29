/*
  Warnings:

  - Made the column `guideId` on table `events` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
UPDATE "events" e
SET "guideId" = (
    SELECT pg."guideId"
    FROM "project_guides" pg
    WHERE pg."projectId" = e."projectId"
    LIMIT 1
)
WHERE e."guideId" IS NULL;

ALTER TABLE "events" DROP CONSTRAINT "events_guideId_fkey";

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "modality" VARCHAR(20) NOT NULL DEFAULT 'presencial',
ALTER COLUMN "guideId" SET NOT NULL;

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "isMeeting" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "guides"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
