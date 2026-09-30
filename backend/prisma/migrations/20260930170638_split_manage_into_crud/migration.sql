-- Nuevos permisos: crear/editar/eliminar en vez de "gestionar",
-- para eventos, categorías, guías y correo.
INSERT INTO "permissions" ("id", "description") VALUES
    ('events:edit', 'Editar eventos'),
    ('categories:create', 'Crear categorías'),
    ('categories:edit', 'Editar categorías'),
    ('categories:delete', 'Eliminar categorías'),
    ('guides:create', 'Crear guías'),
    ('guides:edit', 'Editar guías'),
    ('guides:delete', 'Eliminar guías'),
    ('email:create', 'Crear plantillas de correo'),
    ('email:edit', 'Editar plantillas de correo'),
    ('email:delete', 'Eliminar plantillas de correo');

-- Migra las asignaciones: quien tenía "gestionar" pasa a tener las
-- acciones equivalentes.
INSERT INTO "role_permissions" ("roleId", "permissionId")
SELECT "roleId", 'events:edit' FROM "role_permissions"
WHERE "permissionId" = 'events:manage'
ON CONFLICT DO NOTHING;

INSERT INTO "role_permissions" ("roleId", "permissionId")
SELECT "roleId", unnest(ARRAY['categories:create', 'categories:edit', 'categories:delete'])
FROM "role_permissions" WHERE "permissionId" = 'categories:manage'
ON CONFLICT DO NOTHING;

INSERT INTO "role_permissions" ("roleId", "permissionId")
SELECT "roleId", unnest(ARRAY['guides:create', 'guides:edit', 'guides:delete'])
FROM "role_permissions" WHERE "permissionId" = 'guides:manage'
ON CONFLICT DO NOTHING;

INSERT INTO "role_permissions" ("roleId", "permissionId")
SELECT "roleId", unnest(ARRAY['email:create', 'email:edit', 'email:delete'])
FROM "role_permissions" WHERE "permissionId" = 'email:manage'
ON CONFLICT DO NOTHING;

-- Elimina los permisos "gestionar" antiguos (la cascada borra las
-- asignaciones que quedaran en role_permissions).
DELETE FROM "permissions" WHERE "id" IN (
    'events:manage', 'categories:manage', 'guides:manage', 'email:manage'
);