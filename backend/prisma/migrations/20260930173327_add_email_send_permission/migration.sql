INSERT INTO "permissions" ("id", "description") VALUES
    ('email:send', 'Enviar correos masivos');

INSERT INTO "role_permissions" ("roleId", "permissionId") VALUES
    ('admin', 'email:send');