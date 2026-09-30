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
    registerForEvent,
    RegistrationError,
    unregisterFromEvent,
} from '../services/registration.js';

// Campos comunes a un evento suelto y a una serie.
const eventFields = {
    title: z.string().trim().min(1).max(120),
    subtitle: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(2000).optional(),
    location: z.string().trim().min(1).max(200),
    capacity: z.number().int().positive().max(100_000).optional(),
    categoryId: z.uuid(),
    guideId: z.uuid(),
};

// La categoría debe existir y estar activa: una inactiva no admite eventos nuevos.
const isActiveCategory = async (categoryId: string): Promise<boolean> => {
    const category = await prisma.category.findUnique({
        where: { id: categoryId },
        select: { active: true },
    });

    return category?.active === true;
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

    const { from, to } = query.data;

    const rows = await prisma.event.findMany({
        where: {
            ...(from && { endsAt: { gte: new Date(from) } }),
            ...(to && { startsAt: { lte: new Date(to) } }),
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

        if (!(await isActiveCategory(categoryId))) {
            res.status(400).json({ error: 'Categoría no válida' });
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

        res.status(201).json({ event });
    },
);

// Editar un evento suelto: solo quien tiene permiso de gestión.
eventsRouter.patch(
    '/:id',
    requirePermission('events:edit'),
    async (req, res) => {
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

        if (!(await isActiveCategory(categoryId))) {
            res.status(400).json({ error: 'Categoría no válida' });
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

        res.json({ event });
    },
);

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

        if (!(await isActiveCategory(fields.categoryId))) {
            res.status(400).json({ error: 'Categoría no válida' });
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
