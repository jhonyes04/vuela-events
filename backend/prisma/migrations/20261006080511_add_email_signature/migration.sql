-- AlterTable
ALTER TABLE "users" ADD COLUMN     "emailSignature" TEXT;

-- CreateTable
CREATE TABLE "email_signature_images" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "contentType" VARCHAR(40) NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_signature_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_signature_images_userId_idx" ON "email_signature_images"("userId");

-- AddForeignKey
ALTER TABLE "email_signature_images" ADD CONSTRAINT "email_signature_images_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
