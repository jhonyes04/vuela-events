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

const idParamSchema = z.object({ id: z.uuid() });

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
    requirePermission('categories:view', 'categories:manage'),
    async (_req, res) => {
        const categories = await listCategories();

        res.json({ categories });
    },
);

categoriesRouter.post(
    '/',
    requirePermission('categories:manage'),
    async (req, res) => {
        const body = createCategorySchema.safeParse(req.body);

        if (!body.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        try {
            const category = await createCategory(
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
    requirePermission('categories:manage'),
    async (req, res) => {
        const params = idParamSchema.safeParse(req.params);
        const body = updateCategorySchema.safeParse(req.body);

        if (!params.success || !body.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        try {
            const category = await updateCategory(params.data.id, body.data);

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
    requirePermission('categories:manage'),
    async (req, res) => {
        const params = idParamSchema.safeParse(req.params);

        if (!params.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        try {
            await deleteCategory(params.data.id);
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
