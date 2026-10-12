/*
  Warnings:

  - You are about to drop the column `maintenandceMode` on the `app_settings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "app_settings" DROP COLUMN "maintenandceMode",
ADD COLUMN     "maintenanceMode" BOOLEAN NOT NULL DEFAULT false;
