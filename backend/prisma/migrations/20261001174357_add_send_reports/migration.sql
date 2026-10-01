-- CreateTable
CREATE TABLE "sent_reports" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "senderId" UUID NOT NULL,
    "filename" VARCHAR(300) NOT NULL,
    "pdf" BYTEA NOT NULL,
    "recipientUserIds" UUID[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sent_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sent_reports_eventId_idx" ON "sent_reports"("eventId");

-- CreateIndex
CREATE INDEX "sent_reports_senderId_idx" ON "sent_reports"("senderId");

-- AddForeignKey
ALTER TABLE "sent_reports" ADD CONSTRAINT "sent_reports_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sent_reports" ADD CONSTRAINT "sent_reports_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
