import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import {
    MaterialManageError,
    createMaterial,
    deleteMaterial,
    listMaterials,
    updateMaterial,
} from '../services/materials.js';

const idParamsSchema = z.object({ id: z.uuid() });

const observationsSchema = z.string().trim().max(300).optional();

const createMaterialSchema = z.strictObject({
    name: z.string().trim().min(2).max(100),
    observations: observationsSchema,
});

const updateMaterialSchema = z.strictObject({
    name: z.string().trim().min(2).max(100),
    observations: observationsSchema,
    active: z.boolean(),
});

const materialManageErrors = {
    duplicate: [409, 'Ya existe un material con ese nombre'],
    not_found: [404, 'Material no encontrado'],
    forbidden: [403, 'No puedes gestionar un material que no creaste'],
    in_use: [409, 'No se puede eliminar: hay eventos con este material'],
} as const;

export const materialRouter = Router();

materialRouter.use(requireAuth);

materialRouter.get(
    '/',
    requirePermission(
        'materials:view',
        'materials:create',
        'materials:edit',
        'materials:edit:own',
        'materials:delete',
        'materials:delete:own',
        // El formulario de eventos necesita elegir materiales.
        'events:create',
        'events:edit',
    ),
    async (_req, res) => {
        const materials = await listMaterials();

        res.json({ materials });
    },
);

materialRouter.post(
    '/',
    requirePermission('materials:create'),
    async (req, res) => {
        const actor = req.user;

        if (!actor) {
            res.status(401).json({ error: 'Autenticación requerida' });
            return;
        }

        const body = createMaterialSchema.safeParse(req.body);

        if (!body.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        try {
            const material = await createMaterial(
                actor.id,
                body.data.name,
                body.data.observations ?? null,
            );

            res.status(201).json({ material });
        } catch (e) {
            if (e instanceof MaterialManageError) {
                const [status, error] = materialManageErrors[e.reason];

                res.status(status).json({ error });
                return;
            }

            throw e;
        }
    },
);

materialRouter.patch(
    '/:id',
    requirePermission('materials:edit', 'materials:edit:own'),
    async (req, res) => {
        const actor = req.user;

        if (!actor) {
            res.status(401).json({ error: 'Autenticación requerida' });
            return;
        }

        const params = idParamsSchema.safeParse(req.params);
        const body = updateMaterialSchema.safeParse(req.body);

        if (!params.success || !body.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        try {
            const material = await updateMaterial(actor, params.data.id, {
                ...body.data,
                observations: body.data.observations ?? null,
            });

            res.json({ material });
        } catch (e) {
            if (e instanceof MaterialManageError) {
                const [status, error] = materialManageErrors[e.reason];

                res.status(status).json({ error });
                return;
            }

            throw e;
        }
    },
);

materialRouter.delete(
    '/:id',
    requirePermission('materials:delete', 'materials:delete:own'),
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
            await deleteMaterial(actor, params.data.id);

            res.status(204).end();
        } catch (e) {
            if (e instanceof MaterialManageError) {
                const [status, error] = materialManageErrors[e.reason];

                res.status(status).json({ error });
                return;
            }

            throw e;
        }
    },
);
