-- CreateTable
CREATE TABLE "project_documents" (
    "projectId" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_documents_pkey" PRIMARY KEY ("projectId","documentId")
);

-- CreateIndex
CREATE INDEX "project_documents_documentId_idx" ON "project_documents"("documentId");

-- AddForeignKey
ALTER TABLE "project_documents" ADD CONSTRAINT "project_documents_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_documents" ADD CONSTRAINT "project_documents_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
