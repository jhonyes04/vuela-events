-- CreateTable
CREATE TABLE "drive_folders" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "folderId" VARCHAR(100) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drive_folders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "drive_folders_name_key" ON "drive_folders"("name");
