import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import {
    EmailTemplateManageError,
    createEmailTemplate,
    deleteEmailTemplate,
    listEmailTemplates,
    updateEmailTemplate,
} from '../services/emailTemplates.js';

const idParamsSchema = z.object({ id: z.uuid() });

const createEmailTemplateSchema = z.strictObject({
    name: z.string().trim().min(2).max(100),
    subject: z.string().trim().min(2).max(200),
    body: z.string().trim().min(1).max(50_000),
});

const updateEmailTemplateSchema = z.strictObject({
    name: z.string().trim().min(2).max(100),
    subject: z.string().trim().min(2).max(200),
    body: z.string().trim().min(1).max(50_000),
    active: z.boolean(),
});

const emailTemplateManageErrors = {
    duplicate: [409, 'Ya existe una plantilla con ese nombre'],
    not_found: [404, 'Plantilla no encontrada'],
} as const;

export const emailTemplatesRouter = Router();

emailTemplatesRouter.use(requireAuth);

emailTemplatesRouter.get(
    '/',
    requirePermission('email:view', 'email:manage'),
    async (_req, res) => {
        const templates = await listEmailTemplates();

        res.json({ templates });
    },
);

emailTemplatesRouter.post(
    '/',
    requirePermission('email:manage'),
    async (req, res) => {
        const body = createEmailTemplateSchema.safeParse(req.body);

        if (!body.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        try {
            const template = await createEmailTemplate(
                body.data.name,
                body.data.subject,
                body.data.body,
            );

            res.status(201).json({ template });
        } catch (e) {
            if (e instanceof EmailTemplateManageError) {
                const [status, error] = emailTemplateManageErrors[e.reason];

                res.status(status).json({ error });
                return;
            }

            throw e;
        }
    },
);

emailTemplatesRouter.patch(
    '/:id',
    requirePermission('email:manage'),
    async (req, res) => {
        const params = idParamsSchema.safeParse(req.params);
        const body = updateEmailTemplateSchema.safeParse(req.body);

        if (!params.success || !body.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        try {
            const template = await updateEmailTemplate(
                params.data.id,
                body.data,
            );

            res.json({ template });
        } catch (e) {
            if (e instanceof EmailTemplateManageError) {
                const [status, error] = emailTemplateManageErrors[e.reason];

                res.status(status).json({ error });
                return;
            }

            throw e;
        }
    },
);

emailTemplatesRouter.delete(
    '/:id',
    requirePermission('email:manage'),
    async (req, res) => {
        const params = idParamsSchema.safeParse(req.params);

        if (!params.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        try {
            await deleteEmailTemplate(params.data.id);
            res.status(204).end();
        } catch (e) {
            if (e instanceof EmailTemplateManageError) {
                const [status, error] = emailTemplateManageErrors[e.reason];

                res.status(status).json({ error });
                return;
            }

            throw e;
        }
    },
);
