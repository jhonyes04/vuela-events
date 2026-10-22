-- CreateTable
CREATE TABLE "event_materials" (
    "eventId" UUID NOT NULL,
    "materialId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_materials_pkey" PRIMARY KEY ("eventId","materialId")
);

-- CreateIndex
CREATE INDEX "event_materials_materialId_idx" ON "event_materials"("materialId");

-- AddForeignKey
ALTER TABLE "event_materials" ADD CONSTRAINT "event_materials_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_materials" ADD CONSTRAINT "event_materials_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
