-- Crear evento suelto o serie recurrente es la misma acción de negocio:
-- basta con "events:create". Se retira el permiso separado y sus asignaciones.
DELETE FROM "role_permissions" WHERE "permissionId" = 'events:create_recurring';
DELETE FROM "permissions" WHERE "id" = 'events:create_recurring';
