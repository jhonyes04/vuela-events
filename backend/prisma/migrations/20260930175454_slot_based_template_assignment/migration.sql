/*
  Warnings:

  - The primary key for the `email_template_assignments` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `convocatoriaTemplateId` on the `email_template_assignments` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `email_template_assignments` table. All the data in the column will be lost.
  - You are about to drop the column `parteFirmasTemplateId` on the `email_template_assignments` table. All the data in the column will be lost.
  - Added the required column `slot` to the `email_template_assignments` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "email_template_assignments" DROP CONSTRAINT "email_template_assignments_convocatoriaTemplateId_fkey";

-- DropForeignKey
ALTER TABLE "email_template_assignments" DROP CONSTRAINT "email_template_assignments_parteFirmasTemplateId_fkey";

-- AlterTable
ALTER TABLE "email_template_assignments" DROP CONSTRAINT "email_template_assignments_pkey",
DROP COLUMN "convocatoriaTemplateId",
DROP COLUMN "id",
DROP COLUMN "parteFirmasTemplateId",
ADD COLUMN     "slot" VARCHAR(40) NOT NULL,
ADD COLUMN     "templateId" UUID,
ADD CONSTRAINT "email_template_assignments_pkey" PRIMARY KEY ("slot");

-- AddForeignKey
ALTER TABLE "email_template_assignments" ADD CONSTRAINT "email_template_assignments_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "email_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
