-- CreateTable
CREATE TABLE "email_logs" (
    "id" UUID NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "to" VARCHAR(255) NOT NULL,
    "subject" VARCHAR(200) NOT NULL,
    "slot" VARCHAR(40),
    "origin" VARCHAR(10) NOT NULL,
    "senderId" UUID,
    "ok" BOOLEAN NOT NULL,
    "error" TEXT,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_logs_sentAt_idx" ON "email_logs"("sentAt");

-- AddForeignKey
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
