/*
  Warnings:

  - You are about to drop the column `lastname` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "lastname",
ADD COLUMN     "lastName" VARCHAR(200) NOT NULL DEFAULT '';
