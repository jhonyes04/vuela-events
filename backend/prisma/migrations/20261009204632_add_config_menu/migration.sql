-- CreateTable
CREATE TABLE "app_settings" (
    "id" VARCHAR(20) NOT NULL,
    "userMenuStyle" VARCHAR(20) NOT NULL DEFAULT 'dropdown',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id")
);
