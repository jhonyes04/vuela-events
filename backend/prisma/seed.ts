// Catálogo fijo de roles/permisos: antes vivía como INSERT dentro de las
// migraciones (perdido al comprimirlas en una sola). Idempotente: se puede
// ejecutar en cualquier entorno (dev tras un reset, o un deploy nuevo) sin
// duplicar ni pisar roles ya creados a mano desde la app.
import { prisma } from '../src/lib/prisma.js';

const ROLES: { id: string; name: string; protected: boolean }[] = [
    { id: 'admin', name: 'Administrador', protected: true },
    { id: 'dt', name: 'DT', protected: true },
    { id: 'ail', name: 'AIL', protected: true },
];

const PERMISSIONS: { id: string; description: string }[] = [
    { id: 'events:create', description: 'Crear eventos sueltos' },
    { id: 'events:view', description: 'Ver gestión de eventos' },
    { id: 'events:edit', description: 'Editar eventos' },
    { id: 'events:delete', description: 'Eliminar eventos' },
    { id: 'categories:view', description: 'Ver categorías' },
    { id: 'categories:create', description: 'Crear categorías' },
    { id: 'categories:edit', description: 'Editar categorías' },
    { id: 'categories:delete', description: 'Eliminar categorías' },
    { id: 'guides:view', description: 'Ver guías' },
    { id: 'guides:create', description: 'Crear guías' },
    { id: 'guides:edit', description: 'Editar guías' },
    { id: 'guides:delete', description: 'Eliminar guías' },
    { id: 'email:view', description: 'Ver plantillas de correo' },
    { id: 'email:create', description: 'Crear plantillas de correo' },
    { id: 'email:edit', description: 'Editar plantillas de correo' },
    { id: 'email:delete', description: 'Eliminar plantillas de correo' },
    { id: 'email:send', description: 'Enviar correos masivos' },
    { id: 'users:manage', description: 'Gestionar usuarios (rol, alta/baja)' },
    { id: 'roles:manage', description: 'Gestionar roles y permisos' },
    { id: 'audit:manage', description: 'Ver y gestionar auditoría' },
    { id: 'stats:view', description: 'Ver estadísticas' },
];

// Permisos que cada rol tiene hoy, acumulados de todas las migraciones
// de datos que existían antes de comprimir el historial.
const ROLE_PERMISSIONS: Record<string, string[]> = {
    admin: [
        'events:create',
        'events:view',
        'events:edit',
        'events:delete',
        'categories:view',
        'categories:create',
        'categories:edit',
        'categories:delete',
        'guides:view',
        'guides:create',
        'guides:edit',
        'guides:delete',
        'email:view',
        'email:create',
        'email:edit',
        'email:delete',
        'email:send',
        'users:manage',
        'roles:manage',
        'audit:manage',
        'stats:view',
    ],
    // Todo menos gestión de usuarios y de roles.
        dt: [
        'events:create',
        'events:view',
        'events:edit',
        'events:delete',
        'categories:view',
        'categories:create',
        'categories:edit',
        'categories:delete',
        'guides:view',
        'guides:create',
        'guides:edit',
        'guides:delete',
        'email:view',
        'email:create',
        'email:edit',
        'email:delete',
        'email:send',
        'stats:view',
    ],
    ail: [],
};

const main = async () => {
    for (const role of ROLES) {
        await prisma.role.upsert({
            where: { id: role.id },
            update: {},
            create: role,
        });
    }

    for (const permission of PERMISSIONS) {
        await prisma.permission.upsert({
            where: { id: permission.id },
            update: { description: permission.description },
            create: permission,
        });
    }

    for (const [roleId, permissionIds] of Object.entries(ROLE_PERMISSIONS)) {
        for (const permissionId of permissionIds) {
            await prisma.rolePermission.upsert({
                where: { roleId_permissionId: { roleId, permissionId } },
                update: {},
                create: { roleId, permissionId },
            });
        }
    }

    console.log('Seed de roles/permisos completado.');
};

main()
    .catch((e) => {
        console.error(e);
        process.exitCode = 1;
    })
    .finally(() => void prisma.$disconnect());
