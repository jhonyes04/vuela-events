-- CreateTable
CREATE TABLE "event_attachments" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "fileName" VARCHAR(255) NOT NULL,
    "contentType" VARCHAR(100) NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_attachments_eventId_idx" ON "event_attachments"("eventId");

-- AddForeignKey
ALTER TABLE "event_attachments" ADD CONSTRAINT "event_attachments_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
