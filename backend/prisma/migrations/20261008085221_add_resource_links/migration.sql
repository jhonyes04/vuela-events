-- DropIndex
DROP INDEX "sent_reports_recipient_user_ids_gin_idx";

-- CreateTable
CREATE TABLE "resource_links" (
    "id" UUID NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "url" VARCHAR(2048) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resource_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "resource_links_title_key" ON "resource_links"("title");
