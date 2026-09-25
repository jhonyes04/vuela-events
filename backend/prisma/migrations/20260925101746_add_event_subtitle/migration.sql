/*
  Warnings:

  - Added the required column `subtitle` to the `events` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "events" ADD COLUMN     "subtitle" VARCHAR(200) NOT NULL;
