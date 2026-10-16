-- CreateTable
CREATE TABLE "noreply_smtp_config" (
    "id" VARCHAR(20) NOT NULL,
    "host" VARCHAR(250) NOT NULL,
    "port" INTEGER NOT NULL,
    "secure" BOOLEAN NOT NULL DEFAULT true,
    "user" VARCHAR(255) NOT NULL,
    "password" TEXT NOT NULL,
    "fromName" VARCHAR(100) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "noreply_smtp_config_pkey" PRIMARY KEY ("id")
);
