-- Renombra la entidad "categoría" a "proyecto" en toda la base: tabla,
-- columnas, índices, constraints, y los datos ya guardados que usaban el
-- nombre viejo (ids de permisos y acciones de auditoría). Nada se borra ni
-- se recrea: son RENAME/UPDATE, así que los datos existentes se conservan.

BEGIN;

-- Tabla "categories" -> "projects"
ALTER TABLE "categories" RENAME TO "projects";
ALTER TABLE "projects" RENAME CONSTRAINT "categories_pkey" TO "projects_pkey";
ALTER INDEX "categories_name_key" RENAME TO "projects_name_key";

-- events.categoryId -> events.projectId
ALTER TABLE "events" RENAME COLUMN "categoryId" TO "projectId";
ALTER TABLE "events" RENAME CONSTRAINT "events_categoryId_fkey" TO "events_projectId_fkey";
ALTER INDEX "events_categoryId_idx" RENAME TO "events_projectId_idx";

-- user_category_preferences -> user_project_preferences
ALTER TABLE "user_category_preferences" RENAME TO "user_project_preferences";
ALTER TABLE "user_project_preferences" RENAME COLUMN "categoryId" TO "projectId";
ALTER TABLE "user_project_preferences" RENAME CONSTRAINT "user_category_preferences_pkey" TO "user_project_preferences_pkey";
ALTER TABLE "user_project_preferences" RENAME CONSTRAINT "user_category_preferences_categoryId_fkey" TO "user_project_preferences_projectId_fkey";

-- Permisos: el id cambia en cascada a role_permissions.permissionId
-- (role_permissions_permissionId_fkey tiene ON UPDATE CASCADE), así que los
-- roles que ya tenían el permiso lo conservan sin más pasos.
UPDATE "permissions" SET "id" = 'projects:view', "description" = 'Ver proyectos' WHERE "id" = 'categories:view';
UPDATE "permissions" SET "id" = 'projects:create', "description" = 'Crear proyectos' WHERE "id" = 'categories:create';
UPDATE "permissions" SET "id" = 'projects:edit', "description" = 'Editar proyectos' WHERE "id" = 'categories:edit';
UPDATE "permissions" SET "id" = 'projects:delete', "description" = 'Eliminar proyectos' WHERE "id" = 'categories:delete';

-- Auditoría histórica: mismo hecho, nuevo nombre de acción.
UPDATE "audit_logs" SET "action" = 'project_created' WHERE "action" = 'category_created';
UPDATE "audit_logs" SET "action" = 'project_updated' WHERE "action" = 'category_updated';
UPDATE "audit_logs" SET "action" = 'project_deleted' WHERE "action" = 'category_deleted';

COMMIT;
