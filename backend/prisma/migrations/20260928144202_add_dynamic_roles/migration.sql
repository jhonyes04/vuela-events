-- Tablas nuevas
CREATE TABLE "roles" (
    "id"        VARCHAR(40) NOT NULL,
    "name"      VARCHAR(80) NOT NULL,
    "protected" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "permissions" (
    "id"          VARCHAR(60) NOT NULL,
    "description" VARCHAR(200) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "role_permissions" (
    "roleId"       VARCHAR(40) NOT NULL,
    "permissionId" VARCHAR(60) NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("roleId", "permissionId"),
    CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId")
        REFERENCES "roles"("id") ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId")
        REFERENCES "permissions"("id") ON UPDATE CASCADE ON DELETE CASCADE
);

-- Siembra: los tres roles fijos, protegidos frente a borrado
INSERT INTO "roles" ("id", "name", "protected") VALUES
    ('admin', 'Administrador', true),
    ('dt', 'DT', true),
    ('ail', 'AIL', true);

-- Siembra: catálogo fijo de permisos (definido en código, no editable desde la app)
INSERT INTO "permissions" ("id", "description") VALUES
    ('events:create', 'Crear eventos sueltos'),
    ('events:create_recurring', 'Crear series recurrentes'),
    ('events:delete', 'Eliminar eventos'),
    ('users:manage', 'Gestionar usuarios (rol, alta/baja)'),
    ('roles:manage', 'Gestionar roles y permisos');

-- Siembra: permisos que ya tiene cada rol hoy
INSERT INTO "role_permissions" ("roleId", "permissionId") VALUES
    ('admin', 'events:create'),
    ('admin', 'events:create_recurring'),
    ('admin', 'events:delete'),
    ('admin', 'users:manage'),
    ('admin', 'roles:manage'),
    ('dt', 'events:create'),
    ('dt', 'events:create_recurring'),
    ('dt', 'events:delete');

-- users.role (enum) -> users.roleId (FK a roles.id)
ALTER TABLE "users" ADD COLUMN "roleId" VARCHAR(40);

UPDATE "users" SET "roleId" = "role"::text;

ALTER TABLE "users" ALTER COLUMN "roleId" SET NOT NULL;
ALTER TABLE "users" ALTER COLUMN "roleId" SET DEFAULT 'ail';

ALTER TABLE "users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId")
    REFERENCES "roles"("id") ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE "users" DROP COLUMN "role";

DROP TYPE "Role";
