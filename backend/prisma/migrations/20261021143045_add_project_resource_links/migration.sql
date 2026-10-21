-- CreateTable
CREATE TABLE "project_resource_links" (
    "projectId" UUID NOT NULL,
    "resourceLinkId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_resource_links_pkey" PRIMARY KEY ("projectId","resourceLinkId")
);

-- CreateIndex
CREATE INDEX "project_resource_links_resourceLinkId_idx" ON "project_resource_links"("resourceLinkId");

-- AddForeignKey
ALTER TABLE "project_resource_links" ADD CONSTRAINT "project_resource_links_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_resource_links" ADD CONSTRAINT "project_resource_links_resourceLinkId_fkey" FOREIGN KEY ("resourceLinkId") REFERENCES "resource_links"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
