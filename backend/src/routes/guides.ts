import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import {
    GuideManageError,
    createGuide,
    deleteGuide,
    listGuides,
    updateGuide,
} from '../services/guides.js';

const idParamsSchema = z.object({ id: z.uuid() });

const createGuideSchema = z.strictObject({
    name: z.string().trim().min(2).max(100),
    url: z.string().trim().max(2048),
});

const updateGuideSchema = z.strictObject({
    name: z.string().trim().min(2).max(100),
    url: z.string().max(2048),
    active: z.boolean(),
});

const guideManageErrors = {
    duplicate: [409, 'Ya existe una guía con ese nombre'],
    not_found: [404, 'Guía no encontrada'],
} as const;

export const guidesRouter = Router();

guidesRouter.use(requireAuth);

guidesRouter.get(
    '/',
    requirePermission('guides:view', 'guides:manage'),
    async (_req, res) => {
        const guides = await listGuides();

        res.json({ guides });
    },
);

guidesRouter.post('/', requirePermission('guides:manage'), async (req, res) => {
    const body = createGuideSchema.safeParse(req.body);

    if (!body.success) {
        res.status(400).json({ error: 'Solicitud no válida' });
        return;
    }

    try {
        const guide = await createGuide(body.data.name, body.data.url);

        res.status(201).json({ guide });
    } catch (e) {
        if (e instanceof GuideManageError) {
            const [status, error] = guideManageErrors[e.reason];

            res.status(status).json({ error });
            return;
        }

        throw e;
    }
});

guidesRouter.patch(
    '/:id',
    requirePermission('guides:manage'),
    async (req, res) => {
        const params = idParamsSchema.safeParse(req.params);
        const body = updateGuideSchema.safeParse(req.body);

        if (!params.success || !body.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        try {
            const guide = await updateGuide(params.data.id, body.data);

            res.json({ guide });
        } catch (e) {
            if (e instanceof GuideManageError) {
                const [status, error] = guideManageErrors[e.reason];

                res.status(status).json({ error });
                return;
            }

            throw e;
        }
    },
);

guidesRouter.delete(
    '/:id',
    requirePermission('guides:manage'),
    async (req, res) => {
        const params = idParamsSchema.safeParse(req.params);

        if (!params.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        try {
            await deleteGuide(params.data.id);
            res.status(204).end();
        } catch (e) {
            if (e instanceof GuideManageError) {
                const [status, error] = guideManageErrors[e.reason];

                res.status(status).json({ error });
                return;
            }

            throw e;
        }
    },
);
