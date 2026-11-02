import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { sendBroadcastNotification } from '../services/notification.js';
import { notificationBus } from '../lib/eventBus.js';
import {
    NO_CONTROL_OR_TAGS,
    MULTILINE_NO_CONTROL_OR_TAGS,
} from '../lib/textValidation.js';

const idParamsSchema = z.object({ id: z.uuid() });
const deleteBodySchema = z.strictObject({
    ids: z.array(z.uuid()).min(1).max(1000),
});
const broadcastSchema = z.strictObject({
    title: z.string().trim().min(1).max(120).regex(NO_CONTROL_OR_TAGS),
    body: z
        .string()
        .trim()
        .min(1)
        .max(2000)
        .regex(MULTILINE_NO_CONTROL_OR_TAGS),
});

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);

// Últimas notificaciones del usuario, más recientes primero
notificationsRouter.get('/', async (req, res) => {
    const actor = req.user;

    if (!actor) {
        res.status(401).json({ error: 'Autenticación requerida' });
        return;
    }

    const notifications = await prisma.notification.findMany({
        where: { userId: actor.id },
        orderBy: { createdAt: 'desc' },
        take: 200,
        select: {
            id: true,
            type: true,
            title: true,
            body: true,
            eventId: true,
            readAt: true,
            createdAt: true,
        },
    });

    res.json({ notifications });
});

notificationsRouter.get('/unread-count', async (req, res) => {
    const actor = req.user;

    if (!actor) {
        res.status(401).json({ error: 'Autenticación requerida' });
        return;
    }

    const count = await prisma.notification.count({
        where: { userId: actor.id, readAt: null },
    });

    res.json({ count });
});

notificationsRouter.patch('/read-all', async (req, res) => {
    const actor = req.user;

    if (!actor) {
        res.status(401).json({ error: 'Autenticación requerida' });
        return;
    }

    await prisma.notification.updateMany({
        where: { userId: actor.id, readAt: null },
        data: { readAt: new Date() },
    });

    notificationBus.emit(actor.id);
    res.status(204).end();
});

notificationsRouter.patch('/unread-all', async (req, res) => {
    const actor = req.user;

    if (!actor) {
        res.status(401).json({ error: 'Autenticación requerida' });
        return;
    }

    await prisma.notification.updateMany({
        where: { userId: actor.id, readAt: { not: null } },
        data: { readAt: null },
    });

    notificationBus.emit(actor.id);
    res.status(204).end();
});

notificationsRouter.patch('/:id/read', async (req, res) => {
    const actor = req.user;

    if (!actor) {
        res.status(401).json({ error: 'Autenticación requerida' });
        return;
    }

    const params = idParamsSchema.safeParse(req.params);

    if (!params.success) {
        res.status(400).json({ error: 'Id no válido' });
        return;
    }

    await prisma.notification.updateMany({
        where: { id: params.data.id, userId: actor.id, readAt: null },
        data: { readAt: new Date() },
    });

    notificationBus.emit(actor.id);
    res.status(204).end();
});

notificationsRouter.patch('/:id/unread', async (req, res) => {
    const actor = req.user;

    if (!actor) {
        res.status(401).json({ error: 'Autenticación requerida' });
        return;
    }

    const params = idParamsSchema.safeParse(req.params);

    if (!params.success) {
        res.status(400).json({ error: 'Id no válido' });
        return;
    }

    await prisma.notification.updateMany({
        where: { id: params.data.id, userId: actor.id, readAt: { not: null } },
        data: { readAt: null },
    });

    notificationBus.emit(actor.id);
    res.status(204).end();
});

// Borra una o varias, solo las propias (nunca las de otro usuario).
notificationsRouter.delete('/', async (req, res) => {
    const actor = req.user;

    if (!actor) {
        res.status(401).json({ error: 'Autenticación requerida' });
        return;
    }

    const body = deleteBodySchema.safeParse(req.body);

    if (!body.success) {
        res.status(400).json({ error: 'Solicitud no válida' });
        return;
    }

    await prisma.notification.deleteMany({
        where: { id: { in: body.data.ids }, userId: actor.id },
    });

    notificationBus.emit(actor.id);
    res.status(204).end();
});

// Mensaje libre de un dt/admin a todos los activos no-admin.
notificationsRouter.post('/broadcast', async (req, res) => {
    const actor = req.user;

    if (!actor) {
        res.status(401).json({ error: 'Autenticación requerida' });
        return;
    }

    if (actor.roleId !== 'dt' && actor.roleId !== 'admin') {
        res.status(403).json({ error: 'No tienes permiso para esto' });
        return;
    }

    const body = broadcastSchema.safeParse(req.body);

    if (!body.success) {
        res.status(400).json({ error: 'Solicitud no válida' });
        return;
    }

    const count = await sendBroadcastNotification(
        actor.id,
        actor.roleId,
        body.data.title,
        body.data.body,
    );

    res.status(201).json({ count });
});

// Avisa en tiempo real de notificaciones nuevas, mientras la campanita está abierta.
notificationsRouter.get('/stream', (req, res) => {
    const actor = req.user;

    if (!actor) {
        res.status(401).json({ error: 'Autenticación requerida' });
        return;
    }

    res.set({ 'Content-Type': 'text/event-stream', Connection: 'keep-alive' });
    res.flushHeaders();

    const onNew = () => res.write('data: changed\n\n');
    notificationBus.on(actor.id, onNew);

    const ping = setInterval(() => res.write(': ping\n\n'), 25000);

    req.on('close', () => {
        clearInterval(ping);
        notificationBus.off(actor.id, onNew);
    });
});
