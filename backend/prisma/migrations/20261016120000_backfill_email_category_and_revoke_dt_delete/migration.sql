-- Plantillas creadas antes de que existiera "category": históricamente las
-- gestionaban admin y dt por igual, así que se backfillean a 'dinamizacion'
-- (el valor más permisivo) para no romper el acceso de dt a lo que ya usaba
-- (p.ej. Convocatorias, Acta de asistencia). Las plantillas nuevas sí se
-- categorizan bien desde el código (createEmailTemplate).
UPDATE "email_templates" SET "category" = 'dinamizacion' WHERE "category" = 'administracion';

-- db:seed solo hace upsert de permisos (nunca borra), así que quitar
-- 'email:delete' de la lista de dt en seed.ts no lo revoca en una base ya
-- sembrada. Se retira aquí explícitamente.
DELETE FROM "role_permissions" WHERE "roleId" = 'dt' AND "permissionId" = 'email:delete';
