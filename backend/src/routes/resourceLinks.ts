import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import {
    ResourceLinkManageError,
    createResourceLink,
    deleteResourceLink,
    listResourceLinks,
    updateResourceLink,
} from '../services/resourceLinks.js';

const idParamsSchema = z.object({ id: z.uuid() });

// Solo http(s)
const urlSchema = z
    .string()
    .trim()
    .max(2048)
    .refine(
        (u) => u.startsWith('http://') || u.startsWith('https://'),
        'La URL debe empezar por http:// o https://',
    );

const createResourceLinkSchema = z.strictObject({
    title: z.string().trim().min(2).max(100),
    url: urlSchema,
});

const updateResourceLinkSchema = z.strictObject({
    title: z.string().trim().min(2).max(100),
    url: urlSchema,
    active: z.boolean(),
});

const resourceLinkManageErrors = {
    duplicate: [409, 'Ya existe un enlace con ese título'],
    not_found: [404, 'Enlace no encontrado'],
} as const;

export const resourceLinkRouter = Router();

resourceLinkRouter.use(requireAuth);

resourceLinkRouter.get(
    '/',
    requirePermission(
        'resources:view',
        'resources:create',
        'resources:edit',
        'resources:delete',
    ),

    async (_req, res) => {
        const links = await listResourceLinks();

        res.json({ links });
    },
);

resourceLinkRouter.post(
    '/',
    requirePermission('resources:create'),
    async (req, res) => {
        const actor = req.user;

        if (!actor) {
            res.status(401).json({ error: 'Autenticación requerida' });
            return;
        }

        const body = createResourceLinkSchema.safeParse(req.body);

        if (!body.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        try {
            const link = await createResourceLink(
                actor.id,
                body.data.title,
                body.data.url,
            );

            res.status(201).json({ link });
        } catch (e) {
            if (e instanceof ResourceLinkManageError) {
                const [status, error] = resourceLinkManageErrors[e.reason];

                res.status(status).json({ error });
                return;
            }

            throw e;
        }
    },
);

resourceLinkRouter.patch(
    '/:id',
    requirePermission('resources:edit'),
    async (req, res) => {
        const actor = req.user;

        if (!actor) {
            res.status(401).json({ error: 'Autenticación requerida' });
            return;
        }

        const params = idParamsSchema.safeParse(req.params);
        const body = updateResourceLinkSchema.safeParse(req.body);

        if (!params.success || !body.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        try {
            const link = await updateResourceLink(
                actor.id,
                params.data.id,
                body.data,
            );

            res.json({ link });
        } catch (e) {
            if (e instanceof ResourceLinkManageError) {
                const [status, error] = resourceLinkManageErrors[e.reason];

                res.status(status).json({ error });
                return;
            }

            throw e;
        }
    },
);

resourceLinkRouter.delete(
    '/:id',
    requirePermission('resources:delete'),
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
            await deleteResourceLink(actor.id, params.data.id);

            res.status(204).end();
        } catch (e) {
            if (e instanceof ResourceLinkManageError) {
                const [status, error] = resourceLinkManageErrors[e.reason];

                res.status(status).json({ error });
                return;
            }

            throw e;
        }
    },
);
