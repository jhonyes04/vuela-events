-- CreateTable
CREATE TABLE "smtp_config" (
    "id" VARCHAR(20) NOT NULL,
    "host" VARCHAR(255) NOT NULL,
    "port" INTEGER NOT NULL,
    "secure" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "smtp_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_template_assignments" (
    "id" VARCHAR(20) NOT NULL,
    "convocatoriaTemplateId" UUID,
    "parteFirmasTemplateId" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_template_assignments_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "email_template_assignments" ADD CONSTRAINT "email_template_assignments_convocatoriaTemplateId_fkey" FOREIGN KEY ("convocatoriaTemplateId") REFERENCES "email_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_template_assignments" ADD CONSTRAINT "email_template_assignments_parteFirmasTemplateId_fkey" FOREIGN KEY ("parteFirmasTemplateId") REFERENCES "email_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
