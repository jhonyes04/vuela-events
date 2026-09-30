INSERT INTO "permissions" ("id", "description") VALUES
    ('email:view', 'Ver plantillas de correo'),
    ('email:manage', 'Gestionar plantillas de correo');

INSERT INTO "role_permissions" ("roleId", "permissionId") VALUES
    ('admin', 'email:view'),
    ('admin', 'email:manage');