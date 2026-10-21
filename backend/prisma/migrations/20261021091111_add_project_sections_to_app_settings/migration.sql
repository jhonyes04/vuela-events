-- AlterTable
ALTER TABLE "app_settings" ADD COLUMN     "projectClosingSections" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "projectOpeningSections" TEXT[] DEFAULT ARRAY[]::TEXT[];
