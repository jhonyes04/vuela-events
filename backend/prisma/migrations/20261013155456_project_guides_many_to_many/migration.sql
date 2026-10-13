-- 1. tabla intermedia
CREATE TABLE "project_guides" (
    "projectId" UUID NOT NULL,
    "guideId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
    CONSTRAINT "project_guides_pkey" PRIMARY KEY ("projectId", "guideId")
);

CREATE INDEX "project_guides_guideId_idx" ON "project_guides"("guideId");

ALTER TABLE "project_guides" ADD CONSTRAINT "project_guides_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_guides" ADD CONSTRAINT "project_guides_guideId_fkey"
    FOREIGN KEY ("guideId") REFERENCES "guides"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 2. backfill: cada proyecto conserva su guía actual
INSERT INTO "project_guides" ("projectId", "guideId")
SELECT "id", "guideId" FROM "projects";

-- 3. projects pierde guideId
ALTER TABLE "projects" DROP CONSTRAINT "projects_guideId_fkey";
DROP INDEX "projects_guideId_idx";
ALTER TABLE "projects" DROP COLUMN "guideId";