-- AlterTable
ALTER TABLE "projects" RENAME COLUMN "description" TO "openingInstructions";
ALTER TABLE "projects" ADD COLUMN "closingInstructions" TEXT;