import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
    registerForEvent,
    RegistrationError,
    unregisterFromEvent,
} from '../services/registration.js';

const createEventSchema = z
    .strictObject({
        title: z.string().trim().min(1).max(120),
        subtitle: z.string().trim().min(1).max(200).optional(),
        description: z.string().trim().max(2000).optional(),
        location: z.string().trim().min(1).max(200),
        startsAt: z.iso.datetime(),
        endsAt: z.iso.datetime(),
        capacity: z.number().int().positive().max(100_000).optional(),
    })
    .refine((e) => new Date(e.endsAt) > new Date(e.startsAt), {
        path: ['endsAt'],
        message: 'La fecha de fin debe ser posterior a la de inicio',
    });

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
    createdAt: true,
    createdBy: { select: { id: true, name: true } },
    _count: { select: { registrations: true } },
} as const;

const idParamsSchema = z.object({ id: z.uuid() });

const registrationErrors = {
    not_found: [404, 'Evento o inscripción no encontrados'],
    already_registered: [409, 'Ya estás inscrito en este evento'],
    event_full: [409, 'El evento está completo'],
    event_ended: [409, 'El evento ya ha finalizado'],
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
eventsRouter.post('/', requireRole('admin', 'dt'), async (req, res) => {
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
    } = body.data;

    const event = await prisma.event.create({
        data: {
            title,
            subtitle,
            description,
            location,
            startsAt: new Date(startsAt),
            endsAt: new Date(endsAt),
            capacity,
            createdById: actor.id,
        },
        select: eventSelect,
    });

    res.status(201).json({ event });
});

// Inscribirse: cualquier usuario autenticado, una vez por evento.
eventsRouter.post('/:id/registrations', async (req, res) => {
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
        const registration = await registerForEvent(actor.id, params.data.id);

        res.status(201).json({ registration });
    } catch (e) {
        if (e instanceof RegistrationError) {
            const [status, error] = registrationErrors[e.reason];

            res.status(status).json({ error });
            return;
        }

        throw e;
    }
});

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
