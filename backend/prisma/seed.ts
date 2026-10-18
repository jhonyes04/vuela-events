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
    { id: 'attendees:view', description: 'Ver participantes para inscribir' },
    { id: 'attendees:add', description: 'Inscribir participantes manualmente' },
    { id: 'attendees:delete', description: 'Quitar participantes de un evento' },
    { id: 'projects:view', description: 'Ver proyectos' },
    { id: 'projects:create', description: 'Crear proyectos' },
    { id: 'projects:edit', description: 'Editar proyectos' },
    { id: 'projects:edit:own', description: 'Editar proyectos propios' },
    { id: 'projects:delete', description: 'Eliminar proyectos' },
    { id: 'projects:delete:own', description: 'Eliminar proyectos propios' },
    { id: 'guides:view', description: 'Ver guías' },
    { id: 'guides:create', description: 'Crear guías' },
    { id: 'guides:edit', description: 'Editar guías' },
    { id: 'guides:edit:own', description: 'Editar guías propias' },
    { id: 'guides:delete', description: 'Eliminar guías' },
    { id: 'guides:delete:own', description: 'Eliminar guías propias' },
    { id: 'resources:view', description: 'Ver recursos' },
    { id: 'resources:create', description: 'Crear recursos' },
    { id: 'resources:edit', description: 'Editar recursos' },
    { id: 'resources:edit:own', description: 'Editar recursos propios' },
    { id: 'resources:delete', description: 'Eliminar recursos' },
    { id: 'resources:delete:own', description: 'Eliminar recursos propios' },
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
    { id: 'sessions:manage', description: 'Ver y cerrar sesiones activas'},
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
        'sessions:manage',
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

type EmailTemplateCategory = 'dinamizacion' | 'administracion';

const EMAIL_TEMPLATES: {
    name: string;
    subject: string;
    body: string;
    active: boolean;
    category: EmailTemplateCategory;
}[] = [
    {
        name: 'Acta de asistencia',
        subject: 'Acta de asistencia {{evento}} {{fecha}}',
        body: '<p>{{saludo}} a tod@s.</p><p></p><p>En adjunto os dejo el acta de asistencia correspondiente a la sesión de <strong>{{evento}}</strong> del pasado día <strong>{{fecha}}</strong>.</p><p></p><p>Muchas gracias por vuestro trabajo.</p><p></p><p>Un abrazo.</p>',
        active: true,
        category: 'dinamizacion',
    },
    {
        name: 'Convocatorias',
        subject: 'Convocatoria asistencia {{evento}}',
        body: '<p>{{saludo}} a tod@s:</p><p></p><p>El motivo de mi email es para comunicaros que se os convoca para el día<strong> {{fecha}} </strong>en horario de<strong> {{horaInicio}} a {{horaFin}} horas,</strong> en el<strong> {{lugar}}</strong> para que impartáis los talleres propuestos dentro del proyecto "Vuela con Salud".</p><p></p><p>Muchas gracias por vuestra implicación y buen hacer.</p><p></p><p>Un abrazo.</p>',
        active: true,
        category: 'dinamizacion',
    },
    {
        name: 'Inscripción a evento',
        subject: 'Inscripción confirmada: {{evento}}',
        body: '<p>{{saludo}}</p><p></p><p>Inscripción confirmada:</p><p></p><ul><li><p>Evento: <strong>{{evento}}</strong> </p></li><li><p>Lugar: <strong>{{lugar}}</strong></p></li><li><p>Fecha: <strong>{{fecha}}</strong></p></li><li><p>Horario: <strong>{{horaInicio}}</strong> a <strong>{{horaFin}}</strong></p></li></ul><p></p><p>Puedes agregar el evento a <a href="{{calendarUrl}}">Google Calendar</a></p><p></p><p>Nos vemos allí,</p><p></p><p>Un saludo</p>',
        active: true,
        category: 'administracion',
    },
    {
        name: 'Cancelación de Inscripción',
        subject: 'Inscripción cancelada: {{evento}}',
        body: '<p>{{saludo}}</p><p></p><p>Inscripción cancelada:</p><p></p><ul><li><p>Evento: <strong>{{evento}}</strong></p></li><li><p>Lugar: <strong>{{lugar}}</strong></p></li><li><p>Fecha: <strong>{{fecha}}</strong></p></li></ul><p></p><p>Nos vemos allí,</p><p></p><p>Un saludo</p>',
        active: true,
        category: 'administracion',
    },
    {
        name: 'Proyecto nuevo',
        subject: 'Nuevo proyecto disponible: {{proyecto}}',
        body: '<p>Hola:</p><p></p><p>Se ha creado un nuevo proyecto, <strong>{{proyecto}}</strong>. Si te interesa participar, puedes marcarlo como de tu interés desde tu perfil de la aplicación haciendo clic en el siguiente botón y te avisaremos de sus próximas sesiones.</p><p></p><p></p><p style="text-align:center"><a href="{{enlacePerfil}}" style="background-color:rgb(244, 214, 78);color:rgb(36, 37, 41);padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block"><strong>Ir a mi perfil</strong></a></p><p></p><p>Un saludo</p>',
        active: true,
        category: 'administracion',
    },
    {
        name: 'Evento nuevo de un proyecto',
        subject: 'Nuevo evento {{evento}} dentro del proyecto {{proyecto}}',
        body: '<p>Hola:</p><p></p><p>Se ha programado un nuevo evento dentro del proyecto <strong>{{proyecto}}</strong>, un proyecto que marcaste como de tu interés. A continuación se muestran los datos el evento:</p><p></p><ul><li><p>Evento: <strong>{{evento}}</strong></p></li><li><p>Lugar: <strong>{{lugar}}</strong>.</p></li></ul><ul><li><p>Fechas:</p><p><strong>{{fechas}}</strong></p></li></ul><p></p><p>Puedes inscribirte desde la aplicación.</p><p></p><p>Un saludo</p>',
        active: true,
        category: 'administracion',
    },
    {
        name: 'Evento o serie cancelados',
        subject: 'Evento {{evento}} cancelado',
        body: '<p>Hola:</p><p></p><p>Te avisamos de que se ha cancelado tu inscripción porque se ha eliminado el siguiente evento de <strong>{{proyecto}}</strong>:</p><p></p><ul><li><p>Evento: <strong>{{evento}}</strong></p></li><li><p>Lugar: <strong>{{lugar}}</strong>.</p></li><li><p>Fechas canceladas:</p><p><strong>{{fechas}}</strong></p></li></ul><p></p><p>Disculpa las molestias.</p><p></p><p>Un saludo</p>',
        active: true,
        category: 'administracion',
    },
    {
        name: 'Mantenimiento',
        subject: 'Mantenimiento programado de Vuela Events',
        body: '<p>Hola:</p><p></p><p>Te avisamos de que la aplicación estará en mantenimiento desde el {{desde}} hasta el {{hasta}}.</p><p></p><p>Motivo: {{motivo}}</p><p></p><p>Durante ese tiempo no podrás acceder a la aplicación. Disculpa las molestias.</p><p></p><p>Un saludo</p>',
        active: true,
        category: 'administracion',
    },
];

const EMAIL_ASSIGNMENTS = [
    { slot: 'convocatoria', templateName: 'Convocatorias' },
    { slot: 'parte_firmas', templateName: 'Acta de asistencia' },
    { slot: 'inscripcion', templateName: 'Inscripción a evento' },
    {
        slot: 'cancelacion_inscripcion',
        templateName: 'Cancelación de Inscripción',
    },
    { slot: 'proyecto_nuevo', templateName: 'Proyecto nuevo' },
    { slot: 'evento_nuevo', templateName: 'Evento nuevo de un proyecto' },
    { slot: 'evento_cancelado', templateName: 'Evento o serie cancelados' },
    { slot: 'mantenimiento', templateName: 'Mantenimiento' },
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

    // Contenido creado antes de que existiera "createdById" se le asigna al
    // admin más antiguo, para que quien solo tenga permiso "propios" pueda
    // seguir gestionándolo (en producción todo lo había creado un admin).
    const fallbackOwner = await prisma.user.findFirst({
        where: { roleId: 'admin' },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
    });

    if (fallbackOwner) {
        await prisma.project.updateMany({
            where: { createdById: null },
            data: { createdById: fallbackOwner.id },
        });
        await prisma.guide.updateMany({
            where: { createdById: null },
            data: { createdById: fallbackOwner.id },
        });
        await prisma.document.updateMany({
            where: { createdById: null },
            data: { createdById: fallbackOwner.id },
        });
        await prisma.resourceLink.updateMany({
            where: { createdById: null },
            data: { createdById: fallbackOwner.id },
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