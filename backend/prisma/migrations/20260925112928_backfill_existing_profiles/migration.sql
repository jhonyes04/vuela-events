-- Las cuentas que existían antes del formulario de perfil ya habían iniciado sesión:
-- se consideran completadas. El nombre de la cuenta de Google (ya guardado en "name",
-- y que en Puntos Vuela es el del propio Punto Vuela) se usa como Punto Vuela;
-- la persona puede corregirlo en «Mi perfil».

-- Auditoría: una entrada por cuenta afectada (antes del UPDATE, para saber cuáles son).
INSERT INTO "audit_logs" ("id", "targetId", "action", "newValue", "createdAt")
SELECT gen_random_uuid(), "id", 'profile_backfilled', 'puntoVuela', NOW() AT TIME ZONE 'UTC'
FROM "users"
WHERE "profileCompletedAt" IS NULL;

UPDATE "users"
SET "puntoVuela" = LEFT("name", 120),
    "profileCompletedAt" = NOW() AT TIME ZONE 'UTC'
WHERE "profileCompletedAt" IS NULL;
