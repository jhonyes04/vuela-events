import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { emitOnlineUsers, onlineUsersBus } from '../lib/eventBus.js';
import {
    listActiveSessions,
    listOnlineUsers,
    revokeSession,
    SessionError,
} from '../services/sessions.js';

const sidParamsSchema = z.object({ sid: z.string().min(1).max(255) });

export const sessionsRouter = Router();

sessionsRouter.get('/online', requireAuth, async (_req, res) => {
    res.json({ users: await listOnlineUsers() });
});

sessionsRouter.get('/online/stream', requireAuth, (req, res) => {
    res.set({ 'Content-Type': 'text/event-stream', Connection: 'keep-alive' });
    res.flushHeaders();

    const onChange = () => res.write('data: changed\n\n');
    onlineUsersBus.on('online', onChange);

    const ping = setInterval(() => res.write(': ping\n\n'), 25000);

    req.on('close', () => {
        clearInterval(ping);
        onlineUsersBus.off('online', onChange);
    });
});

sessionsRouter.use(requireAuth, requirePermission('sessions:manage'));

sessionsRouter.get('/', async (req, res) => {
    res.json({ sessions: await listActiveSessions(req.sessionID) });
});

sessionsRouter.delete('/:sid', async (req, res) => {
    const params = sidParamsSchema.safeParse(req.params);

    if (!params.success) {
        res.status(400).json({ error: 'Solicitud no válida' });
        return;
    }

    // Para cerrar la propia sesión ya está "Cerrar sesión" en el menú.
    if (params.data.sid === req.sessionID) {
        res.status(400).json({
            error: 'No puedes cerrar tu propia sesión desde aquí',
        });
        return;
    }

    try {
        await revokeSession(params.data.sid);
        emitOnlineUsers();

        res.status(204).end();
    } catch (e) {
        if (e instanceof SessionError) {
            res.status(404).json({ error: 'Sesión no encontrada' });
            return;
        }

        throw e;
    }
});
