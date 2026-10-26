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

// Solo http(s): se usa como href en el frontend, y un esquema como
// javascript: ejecutaría código en el origen autenticado al hacer clic.
const urlSchema = z
    .string()
    .trim()
    .max(2048)
    .refine(
        (u) => u.startsWith('http://') || u.startsWith('https://'),
        'La URL debe empezar por http:// o https://',
    );

const ownerIdSchema = z.uuid().optional();

const createGuideSchema = z.strictObject({
    name: z.string().trim().min(2).max(100),
    url: urlSchema,
    ownerId: ownerIdSchema,
});

const updateGuideSchema = z.strictObject({
    name: z.string().trim().min(2).max(100),
    url: urlSchema,
    active: z.boolean(),
    ownerId: ownerIdSchema,
});

const guideManageErrors = {
    duplicate: [409, 'Ya existe una guía con ese nombre'],
    not_found: [404, 'Guía no encontrada'],
    has_projects: [409, 'No se puede eliminar: hay proyectos con esta guía'],
    forbidden: [403, 'No puedes gestionar una guía que no creaste'],
    owner_not_found: [400, 'Propietario no válido'],
} as const;

export const guidesRouter = Router();

guidesRouter.use(requireAuth);

guidesRouter.get(
    '/',
    requirePermission(
        'guides:view',
        'guides:create',
        'guides:edit',
        'guides:edit:own',
        'guides:delete',
        'guides:delete:own',
        // El formulario de eventos necesita elegir guía.
        'events:create',
        'events:edit',
    ),
    async (_req, res) => {
        const guides = await listGuides();

        res.json({ guides });
    },
);

guidesRouter.post('/', requirePermission('guides:create'), async (req, res) => {
    const actor = req.user;

    if (!actor) {
        res.status(401).json({ error: 'Autenticación requerida' });
        return;
    }

    const body = createGuideSchema.safeParse(req.body);

    if (!body.success) {
        res.status(400).json({ error: 'Solicitud no válida' });
        return;
    }

    try {
        const guide = await createGuide(
            actor,
            body.data.name,
            body.data.url,
            body.data.ownerId ?? null,
        );

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
    requirePermission('guides:edit', 'guides:edit:own'),
    async (req, res) => {
        const actor = req.user;

        if (!actor) {
            res.status(401).json({ error: 'Autenticación requerida' });
            return;
        }

        const params = idParamsSchema.safeParse(req.params);
        const body = updateGuideSchema.safeParse(req.body);

        if (!params.success || !body.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        try {
            const guide = await updateGuide(actor, params.data.id, body.data);

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
    requirePermission('guides:delete', 'guides:delete:own'),
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
            await deleteGuide(actor, params.data.id);
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
