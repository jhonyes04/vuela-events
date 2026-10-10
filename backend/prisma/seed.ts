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
    { id: 'attendees:view', description: 'Ver candidatos para inscribir' },
    { id: 'attendees:add', description: 'Inscribir participantes manualmente' },
    { id: 'attendees:delete', description: 'Quitar participantes de un evento' },
    { id: 'projects:view', description: 'Ver proyectos' },
    { id: 'projects:create', description: 'Crear proyectos' },
    { id: 'projects:edit', description: 'Editar proyectos' },
    { id: 'projects:delete', description: 'Eliminar proyectos' },
    { id: 'guides:view', description: 'Ver guías' },
    { id: 'guides:create', description: 'Crear guías' },
    { id: 'guides:edit', description: 'Editar guías' },
    { id: 'guides:delete', description: 'Eliminar guías' },
    { id: 'resources:view', description: 'Ver recursos' },
    { id: 'resources:create', description: 'Crear recursos' },
    { id: 'resources:edit', description: 'Editar recursos' },
    { id: 'resources:delete', description: 'Eliminar recursos' },
    { id: 'email:view', description: 'Ver plantillas de correo' },
    { id: 'email:create', description: 'Crear plantillas de correo' },
    { id: 'email:edit', description: 'Editar plantillas de correo' },
    { id: 'email:delete', description: 'Eliminar plantillas de correo' },
    { id: 'email:send', description: 'Enviar correos masivos' },
    { id: 'users:manage', description: 'Gestionar usuarios (rol, alta/baja)' },
    { id: 'roles:manage', description: 'Gestionar roles y permisos' },
    { id: 'audit:manage', description: 'Ver y gestionar auditoría' },
    { id: 'stats:view', description: 'Ver estadísticas' },
    { id: 'settings:manage', description: 'Gestionar ajustes globales de la app' },
];

// Permisos que cada rol tiene hoy, acumulados de todas las migraciones
// de datos que existían antes de comprimir el historial.
const ROLE_PERMISSIONS: Record<string, string[]> = {
    admin: [
        'events:create',
        'events:view',
        'events:edit',
        'events:delete',
        'attendees:view',
        'attendees:add',
        'attendees:delete',
        'projects:view',
        'projects:create',
        'projects:edit',
        'projects:delete',
        'guides:view',
        'guides:create',
        'guides:edit',
        'guides:delete',
        'resources:view',
        'resources:create',
        'resources:edit',
        'resources:delete',
        'email:view',
        'email:create',
        'email:edit',
        'email:delete',
        'email:send',
        'users:manage',
        'roles:manage',
        'audit:manage',
        'stats:view',
        'settings:manage',
    ],
    // Todo menos gestión de usuarios y de roles.
    dt: [
        'events:create',
        'events:view',
        'events:edit',
        'events:delete',
        'attendees:view',
        'attendees:add',
        'attendees:delete',
        'projects:view',
        'projects:create',
        'projects:edit',
        'projects:delete',
        'guides:view',
        'guides:create',
        'guides:edit',
        'guides:delete',
        'resources:view',
        'resources:create',
        'resources:edit',
        'resources:delete',
        'email:view',
        'email:create',
        'email:edit',
        'email:delete',
        'email:send',
        'stats:view',
    ],
    ail: [
        'resources:view'
    ],
};

const SMTP_CONFIG = {
    id: 'default',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
};

const EMAIL_TEMPLATES: { name: string; subject: string; body: string; active: boolean }[] = [
    {
        name: 'Acta de asistencia',
        subject: 'Acta de asistencia {{proyecto}} {{fecha}}',
        body: '<p>{{saludo}} a tod@s.</p><p></p><p>En adjunto os dejo el acta de asistencia correspondiente a la sesión de <strong>{{proyecto}}</strong> del pasado día <strong>{{fecha}}</strong>.</p><p></p><p>Muchas gracias por vuestro trabajo.</p><p></p><p>Un abrazo.</p>',
        active: true,
    },
    {
        name: 'Convocatorias',
        subject: 'Convocatoria asistencia {{proyecto}}',
        body: '<p>{{saludo}} a tod@s:</p><p></p><p>El motivo de mi email es para comunicaros que se os convoca para el día<strong>&nbsp;{{fecha}} </strong>en horario de<strong> {{horaInicio}} a {{horaFin}} horas,</strong>&nbsp;en el<strong>&nbsp;{{lugar}}</strong>&nbsp;para que impartáis&nbsp;los talleres propuestos dentro del proyecto "Vuela con Salud".</p><p></p><p>Muchas gracias por vuestra implicación y buen hacer.</p><p></p><p>Un abrazo.</p>',
        active: true,
    },
];

const EMAIL_ASSIGNMENTS = [
    { slot: 'convocatoria', templateName: 'Convocatorias' },
    { slot: 'parte_firmas', templateName: 'Acta de asistencia' },
];

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

    await prisma.smtpConfig.upsert({
        where: { id: SMTP_CONFIG.id },
        update: {},
        create: SMTP_CONFIG,
    });

    for (const template of EMAIL_TEMPLATES) {
        await prisma.emailTemplate.upsert({
            where: { name: template.name },
            update: {},
            create: template,
        });
    }

    for (const assignment of EMAIL_ASSIGNMENTS) {
        const template = await prisma.emailTemplate.findUniqueOrThrow({
            where: { name: assignment.templateName },
        });

        await prisma.emailTemplateAssignment.upsert({
            where: { slot: assignment.slot },
            update: {},
            create: { slot: assignment.slot, templateId: template.id },
        });
    }

    console.log('Seed completado.');
};

main()
    .catch((e) => {
        console.error(e);
        process.exitCode = 1;
    })
    .finally(() => void prisma.$disconnect());