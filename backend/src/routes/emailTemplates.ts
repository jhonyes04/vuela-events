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
    category: z.enum(['dinamizacion', 'administracion']).optional(),
});

const updateEmailTemplateSchema = z.strictObject({
    name: z.string().trim().min(2).max(100),
    subject: z.string().trim().min(2).max(200),
    body: z.string().trim().min(1).max(50_000),
    active: z.boolean(),
    category: z.enum(['dinamizacion', 'administracion']).optional(),
});

const emailTemplateManageErrors = {
    duplicate: [409, 'Ya existe una plantilla con ese nombre'],
    not_found: [404, 'Plantilla no encontrada'],
    forbidden: [403, 'No tienes permiso sobre esta plantilla'],
} as const;

export const emailTemplatesRouter = Router();

emailTemplatesRouter.use(requireAuth);

emailTemplatesRouter.get(
    '/',
    requirePermission(
        'email:view',
        'email:create',
        'email:edit',
        'email:delete',
    ),
    async (req, res) => {
        const actor = req.user;

        if (!actor) {
            res.status(401).json({ error: 'Autenticación requerida' });
            return;
        }

        const templates = await listEmailTemplates(actor);

        res.json({ templates });
    },
);

emailTemplatesRouter.post(
    '/',
    requirePermission('email:create'),
    async (req, res) => {
        const actor = req.user;

        if (!actor) {
            res.status(401).json({ error: 'Autenticación requerida' });
            return;
        }

        const body = createEmailTemplateSchema.safeParse(req.body);

        if (!body.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        try {
            const template = await createEmailTemplate(
                actor,
                body.data.name,
                body.data.subject,
                body.data.body,
                body.data.category,
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
    requirePermission('email:edit'),
    async (req, res) => {
        const actor = req.user;

        if (!actor) {
            res.status(401).json({ error: 'Autenticación requerida' });
            return;
        }

        const params = idParamsSchema.safeParse(req.params);
        const body = updateEmailTemplateSchema.safeParse(req.body);

        if (!params.success || !body.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        try {
            const template = await updateEmailTemplate(
                actor,
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
    requirePermission('email:delete'),
    async (req, res) => {
        const actor = req.user;

        if (!actor) {
            res.status(401).json({ error: 'Autenticación requerida' });
            return;
        }

        const params = idParamsSchema.safeParse(req.params);

        if (!params.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        try {
            await deleteEmailTemplate(actor, params.data.id);
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
