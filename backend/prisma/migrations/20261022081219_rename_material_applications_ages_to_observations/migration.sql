/*
  Warnings:

  - You are about to drop the column `ages` on the `materials` table. All the data in the column will be lost.
  - You are about to drop the column `applications` on the `materials` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "materials" DROP COLUMN "ages",
DROP COLUMN "applications",
ADD COLUMN     "observations" VARCHAR(300);
