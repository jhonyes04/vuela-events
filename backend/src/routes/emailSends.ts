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
    recipientRegistrationIds: z.array(z.uuid()).min(1),
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
    app_password_not_configured: [
        409,
        'No tienes una contraseña de aplicación configurada en tu perfil',
    ],
    report_generation_failed: [
        500,
        'No se pudo generar el acta de asistencia para adjuntarla',
    ],
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
            actorId: actor.id,
            actorEmail: actor.email,
            slot: body.data.slot,
            eventId: body.data.eventId,
            recipientRegistrationIds: body.data.recipientRegistrationIds,
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
