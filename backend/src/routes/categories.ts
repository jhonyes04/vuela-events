import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import {
    CATEGORY_COLORS,
    CategoryManageError,
    createCategory,
    deleteCategory,
    listCategories,
    updateCategory,
} from '../services/categories.js';
import {
    addCategoryPreference,
    CategoryPreferenceError,
    listAilUsers,
    listCategoryInterestedUsers,
    removeCategoryPreference,
} from '../services/categoryPreferences.js';

const idParamSchema = z.object({ id: z.uuid() });
const categoryUserParamsSchema = z.object({
    id: z.uuid(),
    userId: z.uuid(),
});
const addInterestedUserSchema = z.strictObject({ userId: z.uuid() });

const createCategorySchema = z.strictObject({
    name: z.string().trim().min(2).max(80),
    color: z.enum(CATEGORY_COLORS),
});

const updateCategorySchema = z.strictObject({
    name: z.string().trim().min(2).max(80),
    color: z.enum(CATEGORY_COLORS),
    active: z.boolean(),
});

const categoryManageErrors = {
    duplicate: [409, 'Ya existe una categoría con ese nombre'],
    not_found: [404, 'Categoría no encontrada'],
    has_events: [409, 'No se puede eliminar: hay eventos con esta categoría'],
} as const;

export const categoriesRouter = Router();

categoriesRouter.use(requireAuth);

categoriesRouter.get(
    '/',
    requirePermission(
        'categories:view',
        'categories:create',
        'categories:edit',
        'categories:delete',
        // El formulario de eventos necesita elegir categoría.
        'events:create',
        'events:edit',
    ),
    async (_req, res) => {
        const categories = await listCategories();

        res.json({ categories });
    },
);

categoriesRouter.get(
    '/interested-users',
    requirePermission('categories:view'),
    async (_req, res) => {
        res.json({ categories: await listCategoryInterestedUsers() });
    },
);

categoriesRouter.get(
    '/ail-users',
    requirePermission('categories:edit'),
    async (_req, res) => {
        res.json({ users: await listAilUsers() });
    },
);

categoriesRouter.post(
    '/:id/interested-users',
    requirePermission('categories:edit'),
    async (req, res) => {
        const params = idParamSchema.safeParse(req.params);
        const body = addInterestedUserSchema.safeParse(req.body);

        if (!params.success || !body.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        try {
            await addCategoryPreference(body.data.userId, params.data.id);
            res.json({ categories: await listCategoryInterestedUsers() });
        } catch (e) {
            if (e instanceof CategoryPreferenceError) {
                res.status(400).json({
                    error: 'Usuario o categoría no válidos',
                });
                return;
            }

            throw e;
        }
    },
);

categoriesRouter.delete(
    '/:id/interested-users/:userId',
    requirePermission('categories:delete'),
    async (req, res) => {
        const params = categoryUserParamsSchema.safeParse(req.params);

        if (!params.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        await removeCategoryPreference(params.data.userId, params.data.id);
        res.json({ categories: await listCategoryInterestedUsers() });
    },
);

categoriesRouter.post(
    '/',
    requirePermission('categories:create'),
    async (req, res) => {
        const actor = req.user;

        if (!actor) {
            res.status(401).json({ error: 'Autenticación requerida' });
            return;
        }

        const body = createCategorySchema.safeParse(req.body);

        if (!body.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        try {
            const category = await createCategory(
                actor.id,
                body.data.name,
                body.data.color,
            );

            res.status(201).json({ category });
        } catch (e) {
            if (e instanceof CategoryManageError) {
                const [status, error] = categoryManageErrors[e.reason];

                res.status(status).json({ error });
                return;
            }

            throw e;
        }
    },
);

categoriesRouter.patch(
    '/:id',
    requirePermission('categories:edit'),
    async (req, res) => {
        const actor = req.user;

        if (!actor) {
            res.status(401).json({ error: 'Autenticación requerida' });
            return;
        }

        const params = idParamSchema.safeParse(req.params);
        const body = updateCategorySchema.safeParse(req.body);

        if (!params.success || !body.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        try {
            const category = await updateCategory(
                actor.id,
                params.data.id,
                body.data,
            );

            res.json({ category });
        } catch (e) {
            if (e instanceof CategoryManageError) {
                const [status, error] = categoryManageErrors[e.reason];

                res.status(status).json({ error });
                return;
            }

            throw e;
        }
    },
);

categoriesRouter.delete(
    '/:id',
    requirePermission('categories:delete'),
    async (req, res) => {
        const actor = req.user;

        if (!actor) {
            res.status(401).json({ error: 'Autenticación requerida' });
            return;
        }

        const params = idParamSchema.safeParse(req.params);

        if (!params.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        try {
            await deleteCategory(actor.id, params.data.id);
            res.status(204).end();
        } catch (e) {
            if (e instanceof CategoryManageError) {
                const [status, error] = categoryManageErrors[e.reason];

                res.status(status).json({ error });
                return;
            }

            throw e;
        }
    },
);
