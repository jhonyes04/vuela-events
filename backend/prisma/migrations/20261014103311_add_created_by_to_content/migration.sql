-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "createdById" UUID;

-- AlterTable
ALTER TABLE "guides" ADD COLUMN     "createdById" UUID;

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "createdById" UUID;

-- AlterTable
ALTER TABLE "resource_links" ADD COLUMN     "createdById" UUID;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guides" ADD CONSTRAINT "guides_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_links" ADD CONSTRAINT "resource_links_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
