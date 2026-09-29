INSERT INTO "permissions" ("id", "description") VALUES
    ('events:view', 'Ver gestión de eventos'),
    ('events:manage', 'Gestionar eventos'),
    ('categories:view', 'Ver categorías'),
    ('categories:manage', 'Gestionar categorías'),
    ('guides:view', 'Ver guías'),
    ('guides:manage', 'Gestionar guías');

INSERT INTO "role_permissions" ("roleId", "permissionId") VALUES
    ('admin', 'events:view'),
    ('admin', 'events:manage'),
    ('admin', 'categories:view'),
    ('admin', 'categories:manage'),
    ('admin', 'guides:view'),
    ('admin', 'guides:manage');