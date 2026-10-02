import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import {
    deleteAuditLogs,
    listAuditLogs,
    recordAudit,
} from '../services/audit.js';

const deleteBodySchema = z.strictObject({
    ids: z.array(z.uuid()).min(1).max(1000),
});

export const auditRouter = Router();

auditRouter.use(requireAuth, requirePermission('audit:manage'));

auditRouter.get('/', async (_req, res) => {
    const logs = await listAuditLogs();

    res.json({ logs });
});

auditRouter.delete('/', async (req, res) => {
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

    const count = await deleteAuditLogs(body.data.ids);

    await recordAudit({
        action: 'audit_log_deleted',
        actorId: actor.id,
        newValue: `${count} registro${count === 1 ? '' : 's'}`,
    });

    res.status(204).end();
});
