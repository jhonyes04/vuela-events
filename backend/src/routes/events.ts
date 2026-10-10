import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import {
    requireAuth,
    requireCompleteProfile,
    requirePermission,
} from '../middleware/auth.js';
import {
    isRealDate,
    MAX_OCCURRENCES,
    RecurrenceError,
} from '../lib/recurrence.js';
import {
    deleteEvent,
    deleteEventSeries,
    EventDeleteError,
} from '../services/eventDeletion.js';
import { createEventSeries } from '../services/eventSeries.js';
import {
    listAttendees,
    listRegistrationCandidates,
    registerForEvent,
    RegistrationError,
    unregisterFromEvent,
    unregisterRegistration,
} from '../services/registration.js';
import {
    generateAttendanceReport,
    AttendanceReportError,
} from '../services/attendanceReport.js';
import { createReportDraft } from '../services/reportDrafts.js';
import { recordAudit } from '../services/audit.js';

// Sin caracteres de control ni < > : evita que title/location (insertados sin
// escapar en el HTML de los correos vía {{proyecto}}/{{lugar}}) cuelen markup.
const NO_CONTROL_OR_TAGS = /^[^\p{C}<>]+$/u;

// Campos comunes a un evento suelto y a una serie.
const eventFields = {
    title: z.string().trim().min(1).max(120).regex(NO_CONTROL_OR_TAGS),
    subtitle: z
        .string()
        .trim()
        .min(1)
        .max(200)
        .regex(NO_CONTROL_OR_TAGS)
        .optional(),
    description: z.string().trim().max(2000).optional(),
    location: z.string().trim().min(1).max(200).regex(NO_CONTROL_OR_TAGS),
    capacity: z.number().int().positive().max(100_000).optional(),
    categoryId: z.uuid(),
    guideId: z.uuid(),
};

// La categoría debe existir y estar activa: una inactiva no admite eventos nuevos.
const isActiveProject = async (categoryId: string): Promise<boolean> => {
    const project = await prisma.category.findUnique({
        where: { id: categoryId },
        select: { active: true },
    });

    return project?.active === true;
};

// La guía debe existir y estar activa: una inactiva no admite eventos nuevos.
const isActiveGuide = async (guideId: string): Promise<boolean> => {
    const guide = await prisma.guide.findUnique({
        where: { id: guideId },
        select: { active: true },
    });

    return guide?.active === true;
};

const createEventSchema = z
    .strictObject({
        ...eventFields,
        startsAt: z.iso.datetime(),
        endsAt: z.iso.datetime(),
    })
    .refine((e) => new Date(e.endsAt) > new Date(e.startsAt), {
        path: ['endsAt'],
        message: 'La fecha de fin debe ser posterior a la de inicio',
    });

const updateEventSchema = z
    .strictObject({
        ...eventFields,
        startsAt: z.iso.datetime(),
        endsAt: z.iso.datetime(),
    })
    .refine((e) => new Date(e.endsAt) > new Date(e.startsAt), {
        path: ['endsAt'],
        message: 'La fecha de fin debe ser posterior a la de inicio',
    });

const participantsCountSchema = z.strictObject({
    participantsCount: z.number().int().min(0).max(100_000).nullable(),
    participantsObservations: z.string().trim().max(500).nullable(),
});

const dateOnly = z.string().refine(isRealDate, 'Fecha no válida');
const timeOfDay = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

const createSeriesSchema = z.strictObject({
    ...eventFields,
    from: dateOnly,
    to: dateOnly,
    // Días ISO: 1 = lunes ... 7 = domingo. Sin repetidos.
    weekdays: z
        .array(z.number().int().min(1).max(7))
        .min(1)
        .max(7)
        .refine((days) => new Set(days).size === days.length),
    startTime: timeOfDay,
    endTime: timeOfDay,
});

const seriesErrors = {
    invalid_range: 'El rango de fechas u horas no es válido',
    range_too_long: 'El rango de fechas es demasiado largo',
    too_many: `Una serie no puede superar las ${MAX_OCCURRENCES} sesiones`,
    empty: 'Ninguna fecha del rango coincide con los días elegidos',
} as const;

const listQuerySchema = z.object({
    from: z.iso.datetime().optional(),
    to: z.iso.datetime().optional(),
    registered: z.literal('1').optional(),
});

const eventSelect = {
    id: true,
    title: true,
    subtitle: true,
    description: true,
    location: true,
    startsAt: true,
    endsAt: true,
    capacity: true,
    participantsCount: true,
    participantsObservations: true,
    seriesId: true,
    createdAt: true,
    createdBy: { select: { id: true, name: true, puntoVuela: true } },
    category: { select: { id: true, name: true, color: true } },
    guide: { select: { id: true, name: true, url: true } },
    _count: {
        select: {
            registrations: { where: { user: { roleId: { not: 'dt' } } } },
        },
    },
} as const;

const eventUserParamsSchema = z.object({ id: z.uuid(), userId: z.uuid() });
const eventRegistrationParamsSchema = z.object({
    id: z.uuid(),
    registrationId: z.uuid(),
});

const idParamsSchema = z.object({ id: z.uuid() });
const seriesParamsSchema = z.object({ seriesId: z.uuid() });

const registrationErrors = {
    not_found: [404, 'Evento o inscripción no encontrados'],
    already_registered: [409, 'Ya estás inscrito en este evento'],
    event_full: [409, 'El evento está completo'],
    event_ended: [409, 'El evento ya ha finalizado'],
    admin_not_allowed: [
        403,
        'Los administradores no pueden inscribirse en eventos',
    ],
} as const;

const attendanceReportErrors = {
    event_not_found: [404, 'Evento no encontrado'],
    no_recipients: [400, 'Selecciona al menos un destinatario'],
    event_not_ended: [409, 'El evento todavía no ha finalizado'],
    signer_title_missing: [
        409,
        'Elige en tu perfil si eres Dinamizador o Dinamizadora',
    ],
} as const;

const attendanceReportSchema = z.strictObject({
    recipientRegistrationIds: z.array(z.uuid()).min(1),
});

export const eventsRouter = Router();

// Ver eventos: cualquier usuario autenticado.
eventsRouter.use(requireAuth);

eventsRouter.get('/', async (req, res) => {
    const actor = req.user;

    if (!actor) {
        res.status(401).json({ error: 'Autenticación requerida' });
        return;
    }

    const query = listQuerySchema.safeParse(req.query);

    if (!query.success) {
        res.status(400).json({ error: 'Solicitud no válida' });
        return;
    }

    const { from, to, registered } = query.data;

    // Un AIL solo ve eventos de categorías que marcó como interés, más los
    // que ya tiene (o tuvo) marcados por estar inscrito en ellos: así nunca
    // desaparece de su calendario algo a lo que ya se apuntó.
    const visibleToAil =
        actor.roleId === 'ail'
            ? {
                  OR: [
                      {
                          category: {
                              userPreferences: {
                                  some: { userId: actor.id },
                              },
                          },
                      },
                      { registrations: { some: { userId: actor.id } } },
                  ],
              }
            : {};

    const rows = await prisma.event.findMany({
        where: {
            ...(from && { endsAt: { gte: new Date(from) } }),
            ...(to && { startsAt: { lte: new Date(to) } }),
            ...(registered && {
                registrations: { some: { userId: actor.id } },
            }),
            ...visibleToAil,
        },
        select: {
            ...eventSelect,
            registrations: {
                where: { userId: actor.id },
                select: { id: true },
            },
        },
        orderBy: { startsAt: 'asc' },
        take: 500,
    });

    const events = rows.map(({ registrations, ...event }) => ({
        ...event,
        registered: registrations.length > 0,
    }));

    res.json({ events });
});

// Crear eventos: solo admin y dt.
eventsRouter.post(
    '/',
    requirePermission('events:create'),
    requireCompleteProfile,
    async (req, res) => {
        const actor = req.user;

        if (!actor) {
            res.status(401).json({ error: 'Autenticación requerida' });
            return;
        }

        const body = createEventSchema.safeParse(req.body);

        if (!body.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        const {
            title,
            subtitle,
            description,
            location,
            startsAt,
            endsAt,
            capacity,
            categoryId,
            guideId,
        } = body.data;

        if (!(await isActiveProject(categoryId))) {
            res.status(400).json({ error: 'Proyecto no válido' });
            return;
        }

        if (!(await isActiveGuide(guideId))) {
            res.status(400).json({ error: 'Guía no válida' });
            return;
        }

        const event = await prisma.event.create({
            data: {
                title,
                subtitle,
                description,
                location,
                startsAt: new Date(startsAt),
                endsAt: new Date(endsAt),
                capacity,
                categoryId,
                guideId,
                createdById: actor.id,
            },
            select: eventSelect,
        });

        await recordAudit({
            action: 'event_created',
            actorId: actor.id,
            newValue: event.title.slice(0, 100),
        });

        res.status(201).json({ event });
    },
);

// Editar un evento suelto: solo quien tiene permiso de gestión.
eventsRouter.patch(
    '/:id',
    requirePermission('events:edit'),
    async (req, res) => {
        const actor = req.user;

        if (!actor) {
            res.status(401).json({ error: 'Autenticación requerida' });
            return;
        }

        const params = idParamsSchema.safeParse(req.params);
        const body = updateEventSchema.safeParse(req.body);

        if (!params.success || !body.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        const {
            title,
            subtitle,
            description,
            location,
            startsAt,
            endsAt,
            capacity,
            categoryId,
            guideId,
        } = body.data;

        if (!(await isActiveProject(categoryId))) {
            res.status(400).json({ error: 'Proyecto no válido' });
            return;
        }

        if (!(await isActiveGuide(guideId))) {
            res.status(400).json({ error: 'Guía no válida' });
            return;
        }

        const exists = await prisma.event.findUnique({
            where: { id: params.data.id },
            select: { id: true },
        });

        if (!exists) {
            res.status(404).json({ error: 'Evento no encontrado' });
            return;
        }

        const event = await prisma.event.update({
            where: { id: params.data.id },
            data: {
                title,
                subtitle,
                description,
                location,
                startsAt: new Date(startsAt),
                endsAt: new Date(endsAt),
                capacity,
                categoryId,
                guideId,
            },
            select: eventSelect,
        });

        await recordAudit({
            action: 'event_updated',
            actorId: actor.id,
            newValue: event.title.slice(0, 100),
        });

        res.json({ event });
    },
);

// Participantes externos atendidos: se rellena aparte, una vez terminado el
// evento (no forma parte del formulario de crear/editar). Tras el fin lo puede
// hacer cualquier persona autenticada; antes, solo quien puede editar eventos.
eventsRouter.patch('/:id/participants-count', async (req, res) => {
    const actor = req.user;

    if (!actor) {
        res.status(401).json({ error: 'Autenticación requerida' });
        return;
    }

    const params = idParamsSchema.safeParse(req.params);
    const body = participantsCountSchema.safeParse(req.body);

    if (!params.success || !body.success) {
        res.status(400).json({ error: 'Solicitud no válida' });
        return;
    }

    const existing = await prisma.event.findUnique({
        where: { id: params.data.id },
        select: { id: true, endsAt: true },
    });

    if (!existing) {
        res.status(404).json({ error: 'Evento no encontrado' });
        return;
    }

    const canEdit = actor.permissions.includes('events:edit');

    if (!canEdit && existing.endsAt > new Date()) {
        res.status(409).json({
            error: 'El evento todavía no ha finalizado',
        });
        return;
    }

    const event = await prisma.event.update({
        where: { id: params.data.id },
        data: {
            participantsCount: body.data.participantsCount,
            participantsObservations: body.data.participantsObservations,
        },
        select: eventSelect,
    });

    await recordAudit({
        action: 'event_participants_updated',
        actorId: actor.id,
        newValue:
            body.data.participantsCount === null
                ? 'sin especificar'
                : String(body.data.participantsCount),
    });

    res.json({ event });
});

// Crear una serie recurrente (mismos días de la semana entre dos fechas): admin y dt.
// El servidor calcula las fechas; nunca se confía en una lista enviada por el cliente.
eventsRouter.post(
    '/recurring',
    requirePermission('events:create'),
    requireCompleteProfile,
    async (req, res) => {
        const actor = req.user;

        if (!actor) {
            res.status(401).json({ error: 'Autenticación requerida' });
            return;
        }

        const body = createSeriesSchema.safeParse(req.body);

        if (!body.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        const { from, to, weekdays, startTime, endTime, ...fields } = body.data;

        if (!(await isActiveProject(fields.categoryId))) {
            res.status(400).json({ error: 'Proyecto no válido' });
            return;
        }

        if (!(await isActiveGuide(fields.guideId))) {
            res.status(400).json({ error: 'Guía no válida' });
            return;
        }

        try {
            const series = await createEventSeries(actor.id, {
                ...fields,
                rule: { from, to, weekdays, startTime, endTime },
            });

            res.status(201).json(series);
        } catch (e) {
            if (e instanceof RecurrenceError) {
                res.status(400).json({ error: seriesErrors[e.reason] });
                return;
            }

            throw e;
        }
    },
);

// Eliminar UNA sesión: admin o quien la creó.
eventsRouter.delete(
    '/:id',
    requirePermission('events:delete'),
    async (req, res) => {
        const actor = req.user;
        const params = idParamsSchema.safeParse(req.params);

        if (!actor) {
            res.status(401).json({ error: 'Autenticación requerida' });
            return;
        }

        if (!params.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        try {
            await deleteEvent(actor, params.data.id);

            res.status(204).end();
        } catch (e) {
            if (e instanceof EventDeleteError) {
                res.status(e.reason === 'not_found' ? 404 : 403).json({
                    error:
                        e.reason === 'not_found'
                            ? 'Evento no encontrado'
                            : 'Solo un administrador o quien creó el evento puede eliminarlo',
                });
                return;
            }

            throw e;
        }
    },
);

// Eliminar las sesiones FUTURAS de una serie: admin o quien la creó.
eventsRouter.delete(
    '/series/:seriesId',
    requirePermission('events:delete'),
    async (req, res) => {
        const actor = req.user;
        const params = seriesParamsSchema.safeParse(req.params);

        if (!actor) {
            res.status(401).json({ error: 'Autenticación requerida' });
            return;
        }

        if (!params.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        try {
            const result = await deleteEventSeries(actor, params.data.seriesId);

            res.status(200).json(result);
        } catch (e) {
            if (e instanceof EventDeleteError) {
                res.status(e.reason === 'not_found' ? 404 : 403).json({
                    error:
                        e.reason === 'not_found'
                            ? 'No hay sesiones futuras que eliminar en esta serie'
                            : 'Solo un administrador o quien creó la serie puede eliminarla',
                });
                return;
            }

            throw e;
        }
    },
);

// Personas inscritas en un evento (Punto Vuela y nombre; sin los DT).
eventsRouter.get('/:id/registrations', async (req, res) => {
    const params = idParamsSchema.safeParse(req.params);

    if (!params.success) {
        res.status(400).json({ error: 'Solicitud no válida' });
        return;
    }

    try {
        res.json({ registrations: await listAttendees(params.data.id) });
    } catch (e) {
        if (e instanceof RegistrationError) {
            const [status, error] = registrationErrors[e.reason];

            res.status(status).json({ error });
            return;
        }

        throw e;
    }
});

// Inscribirse: cualquier usuario autenticado, una vez por evento.
eventsRouter.post(
    '/:id/registrations',
    requireCompleteProfile,
    async (req, res) => {
        const actor = req.user;
        const params = idParamsSchema.safeParse(req.params);

        if (!actor) {
            res.status(401).json({ error: 'Autenticación requerida' });
            return;
        }

        if (!params.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        try {
            const registration = await registerForEvent(
                actor.id,
                params.data.id,
            );

            res.status(201).json({ registration });
        } catch (e) {
            if (e instanceof RegistrationError) {
                const [status, error] = registrationErrors[e.reason];

                res.status(status).json({ error });
                return;
            }

            throw e;
        }
    },
);

// Cancelar la propia inscripción
eventsRouter.delete('/:id/registrations', async (req, res) => {
    const actor = req.user;
    const params = idParamsSchema.safeParse(req.params);

    if (!actor) {
        res.status(401).json({ error: 'Autenticación requerida' });
        return;
    }

    if (!params.success) {
        res.status(400).json({ error: 'Solicitud no válida' });
        return;
    }

    try {
        await unregisterFromEvent(actor.id, params.data.id);

        res.status(204).end();
    } catch (e) {
        if (e instanceof RegistrationError) {
            const [status, error] = registrationErrors[e.reason];

            res.status(status).json({ error });
            return;
        }

        throw e;
    }
});

// Candidatos para añadir manualmente (sólo quien gestiona asistencia)
eventsRouter.get(
    '/:id/registration-candidates',
    requirePermission('attendees:view'),
    async (req, res) => {
        const params = idParamsSchema.safeParse(req.params);

        if (!params.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        try {
            res.json({
                candidates: await listRegistrationCandidates(params.data.id),
            });
        } catch (e) {
            if (e instanceof RegistrationError) {
                const [status, error] = registrationErrors[e.reason];

                res.status(status).json({ error });
                return;
            }

            throw e;
        }
    },
);

// Inscribir a otra persona
eventsRouter.post(
    '/:id/attendees/:userId',
    requirePermission('attendees:add'),
    async (req, res) => {
        const actor = req.user;
        const params = eventUserParamsSchema.safeParse(req.params);

        if (!actor) {
            res.status(401).json({ error: 'Autenticación requerida' });
            return;
        }

        if (!params.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        try {
            const registration = await registerForEvent(
                params.data.userId,
                params.data.id,
                { actorId: actor.id, bypassCapacity: true },
            );

            res.status(201).json({ registration });
        } catch (e) {
            if (e instanceof RegistrationError) {
                const [status, error] = registrationErrors[e.reason];

                res.status(status).json({ error });
                return;
            }

            throw e;
        }
    },
);

// Quitar a alguien (por id de inscripción, no de usuario)
eventsRouter.delete(
    '/:id/attendees/:registrationId',
    requirePermission('attendees:delete'),
    async (req, res) => {
        const actor = req.user;
        const params = eventRegistrationParamsSchema.safeParse(req.params);

        if (!actor) {
            res.status(401).json({ error: 'Autenticación requerida' });
            return;
        }

        if (!params.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        try {
            await unregisterRegistration(
                actor.id,
                params.data.id,
                params.data.registrationId,
            );

            res.status(204).end();
        } catch (e) {
            if (e instanceof RegistrationError) {
                const [status, error] = registrationErrors[e.reason];

                res.status(status).json({ error });
                return;
            }

            throw e;
        }
    },
);

// Genera el acta de asistencia en PDF de los seleccionados (borrador para revisar y enviar).
eventsRouter.post(
    '/:id/attendance-report',
    requirePermission('email:send'),
    async (req, res) => {
        const actor = req.user;
        const params = idParamsSchema.safeParse(req.params);

        if (!actor) {
            res.status(401).json({ error: 'Autenticación requerida' });
            return;
        }

        if (!params.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        const body = attendanceReportSchema.safeParse(req.body);

        if (!body.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        try {
            const { pdf, filename } = await generateAttendanceReport({
                eventId: params.data.id,
                recipientRegistrationIds: body.data.recipientRegistrationIds,
                signerUserId: actor.id,
            });

            // Se guarda como borrador: el envío adjuntará exactamente este PDF.
            const draft = createReportDraft({
                eventId: params.data.id,
                senderId: actor.id,
                registrationIds: [
                    ...new Set(body.data.recipientRegistrationIds),
                ],
                filename,
                pdf,
            });

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Cache-Control', 'private, no-store');
            res.setHeader('X-Report-Draft-Id', draft.id);
            res.setHeader(
                'Content-Disposition',
                "inline; filename*=UTF-8''" + encodeURIComponent(filename),
            );
            res.send(pdf);
        } catch (e) {
            if (e instanceof AttendanceReportError) {
                const [status, error] = attendanceReportErrors[e.reason];

                res.status(status).json({ error });
                return;
            }

            throw e;
        }
    },
);
