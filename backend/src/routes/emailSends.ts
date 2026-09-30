import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { SLOT_IDS } from '../services/emailSending.js';
import {
    getSendJob,
    startBulkSend,
    StartSendError,
} from '../services/emailSendJob.js';

const startSendSchema = z.strictObject({
    slot: z.enum(SLOT_IDS),
    eventId: z.uuid(),
    recipientUserIds: z.array(z.uuid()).min(1),
    smtpPassword: z.string().min(1).max(200),
});

const jobIdParamsSchema = z.object({ jobId: z.uuid() });

const startSendErrors = {
    smtp_not_configured: [409, 'No hay un servidor SMTP configurado'],
    template_not_assigned: [
        409,
        'No hay ninguna plantilla asignada a este envío',
    ],
    event_not_found: [404, 'Evento no encontrado'],
    no_recipients: [400, 'Selecciona al menos un destinatario'],
} as const;

export const emailSendsRouter = Router();

emailSendsRouter.use(requireAuth, requirePermission('email:send'));

emailSendsRouter.post('/', async (req, res) => {
    const actor = req.user;

    if (!actor) {
        res.status(401).json({ error: 'Autenticación requerida' });
        return;
    }

    const body = startSendSchema.safeParse(req.body);

    if (!body.success) {
        res.status(400).json({ error: 'Solicitud no válida' });
        return;
    }

    try {
        const { jobId } = await startBulkSend({
            actorEmail: actor.email,
            smtpPassword: body.data.smtpPassword,
            slot: body.data.slot,
            eventId: body.data.eventId,
            recipientUserIds: body.data.recipientUserIds,
        });

        res.status(202).json({ jobId });
    } catch (e) {
        if (e instanceof StartSendError) {
            const [status, error] = startSendErrors[e.reason];

            res.status(status).json({ error });
            return;
        }

        throw e;
    }
});

emailSendsRouter.get('/:jobId', (req, res) => {
    const params = jobIdParamsSchema.safeParse(req.params);

    if (!params.success) {
        res.status(400).json({ error: 'Solicitud no válida' });
        return;
    }

    const job = getSendJob(params.data.jobId);

    if (!job) {
        res.status(404).json({ error: 'Envío no encontrado' });
        return;
    }

    res.json({ job });
});
