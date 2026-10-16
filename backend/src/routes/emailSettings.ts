import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import {
    EmailSettingsError,
    getSmtpConfig,
    getTemplateAssignments,
    setSmtpConfig,
    setTemplateAssignment,
    SLOT_IDS,
} from '../services/emailSending.js';
import {
    getNoReplySmtpConfig,
    setNoReplyStmpConfig,
} from '../services/noReplyEmail.js';

const smtpConfigSchema = z.strictObject({
    host: z.string().trim().min(1).max(255),
    port: z.number().int().min(1).max(65535),
    secure: z.boolean(),
});

const noReplySmtpConfigSchema = z.strictObject({
    host: z.string().trim().min(1).max(255),
    port: z.number().int().min(1).max(65535),
    secure: z.boolean(),
    user: z.string().trim().min(1).max(255),
    fromName: z.string().trim().min(1).max(100),
    password: z.string().trim().min(1).optional(),
});

const slotParamsSchema = z.object({ slot: z.enum(SLOT_IDS) });

const templateAssignmentBodySchema = z.strictObject({
    templateId: z.uuid().nullable(),
});

const emailSettingsErrors = {
    not_found: [400, 'La plantilla seleccionada no existe'],
} as const;

export const emailSettingsRouter = Router();

emailSettingsRouter.use(requireAuth, requirePermission('settings:manage'));

emailSettingsRouter.get('/', async (_req, res) => {
    const [smtpConfig, noReplySmtpConfig, templateAssignments] =
        await Promise.all([
            getSmtpConfig(),
            getNoReplySmtpConfig(),
            getTemplateAssignments(),
        ]);

    res.json({ smtpConfig, noReplySmtpConfig, templateAssignments });
});

emailSettingsRouter.patch('/smtp', async (req, res) => {
    const actor = req.user;

    if (!actor) {
        res.status(401).json({ error: 'Autenticación requerida' });
        return;
    }

    const body = smtpConfigSchema.safeParse(req.body);

    if (!body.success) {
        res.status(400).json({ error: 'Solicitud no válida' });
        return;
    }

    const smtpConfig = await setSmtpConfig(actor.id, body.data);

    res.json({ smtpConfig });
});

emailSettingsRouter.patch('/noreply-smtp', async (req, res) => {
    const actor = req.user;

    if (!actor) {
        res.status(401).json({ error: 'Autenticación requerida' });
        return;
    }

    const body = noReplySmtpConfigSchema.safeParse(req.body);

    if (!body.success) {
        res.status(400).json({ error: 'Solicitud no válida' });
        return;
    }

    const noReplySmtpConfig = await setNoReplyStmpConfig(actor.id, body.data);

    res.json({ noReplySmtpConfig });
});

emailSettingsRouter.patch('/template-assignment/:slot', async (req, res) => {
    const actor = req.user;

    if (!actor) {
        res.status(401).json({ error: 'Autenticación requerida' });
        return;
    }

    const params = slotParamsSchema.safeParse(req.params);
    const body = templateAssignmentBodySchema.safeParse(req.body);

    if (!params.success || !body.success) {
        res.status(400).json({ error: 'Solicitud no válida' });
        return;
    }

    try {
        const assignment = await setTemplateAssignment(
            actor.id,
            params.data.slot,
            body.data.templateId,
        );

        res.json({ assignment });
    } catch (e) {
        if (e instanceof EmailSettingsError) {
            const [status, error] = emailSettingsErrors[e.reason];

            res.status(status).json({ error });
            return;
        }

        throw e;
    }
});
