-- 1. columna nueva, nullable por ahora
ALTER TABLE "projects" ADD COLUMN "guideId" UUID;

-- 2. backfill: la guía más usada por los eventos de cada proyecto
UPDATE "projects" p
SET "guideId" = (
    SELECT e."guideId"
    FROM "events" e
    WHERE e."projectId" = p.id
    GROUP BY e."guideId"
    ORDER BY count(*) DESC
    LIMIT 1
);

-- 3. proyectos que siguen sin guía (sin eventos previos, o eventos sin
--    guía detectable): se crea una guía placeholder inactiva -no aparece
--    en los selectores normales, salvo al editar el proyecto que la
--    tiene- y se les asigna. Admin la reemplaza luego por la real desde
--    "Gestionar Proyectos".
DO $$
DECLARE
    placeholder_id UUID;
BEGIN
    IF EXISTS (SELECT 1 FROM "projects" WHERE "guideId" IS NULL) THEN
        INSERT INTO "guides" ("id", "name", "url", "active", "updatedAt")
        VALUES (
            gen_random_uuid(),
            'Pendiente de asignar',
            'https://puntosvuela.es',
            false,
            now()
        )
        RETURNING "id" INTO placeholder_id;

        UPDATE "projects"
        SET "guideId" = placeholder_id
        WHERE "guideId" IS NULL;
    END IF;
END $$;

-- 4. ahora sí, requerida + FK + índice
ALTER TABLE "projects" ALTER COLUMN "guideId" SET NOT NULL;
ALTER TABLE "projects" ADD CONSTRAINT "projects_guideId_fkey"
    FOREIGN KEY ("guideId") REFERENCES "guides"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "projects_guideId_idx" ON "projects"("guideId");

-- 5. events pierde la columna
ALTER TABLE "events" DROP CONSTRAINT "events_guideId_fkey";
DROP INDEX "events_guideId_idx";
ALTER TABLE "events" DROP COLUMN "guideId";