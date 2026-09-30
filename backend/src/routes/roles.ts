import { Router, type Response } from 'express';
import { z } from 'zod';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import {
    createRole,
    deleteRole,
    listPermissions,
    listRoles,
    RoleManageError,
    setRolePermissions,
} from '../services/roles.js';

const PERMISSION_IDS = [
    'events:create',
    'events:delete',
    'events:view',
    'events:manage',
    'categories:view',
    'categories:manage',
    'guides:view',
    'guides:manage',
    'email:view',
    'email:manage',
    'users:manage',
    'roles:manage',
] as const;

const permissionIdsSchema = z
    .array(z.enum(PERMISSION_IDS))
    .max(PERMISSION_IDS.length);

const idParamSchema = z.object({
    id: z
        .string()
        .trim()
        .toLowerCase()
        .min(2)
        .max(40)
        .regex(
            /^[a-z][a-z0-9_-]*$/,
            'Solo minúsculas, números, "-" o "_", empezando por letra',
        ),
});

const createRoleSchema = z.strictObject({
    id: idParamSchema.shape.id,
    name: z.string().trim().min(2).max(80),
    permissionIds: permissionIdsSchema,
});

const permissionsBodySchema = z.strictObject({
    permissionIds: permissionIdsSchema,
});

const roleManageErrors = {
    duplicate: [409, 'Ya existe un rol con ese identificador'],
    not_found: [404, 'Rol no encontrado'],
    protected: [403, 'Este rol no se puede eliminar'],
    has_users: [409, 'No se puede eliminar: hay usuarios con este rol'],
} as const;

const handleRoleManageError = (e: unknown, res: Response) => {
    if (e instanceof RoleManageError) {
        const [status, error] = roleManageErrors[e.reason];

        res.status(status).json({ error });
        return true;
    }

    return false;
};

export const rolesRouter = Router();

rolesRouter.use(requireAuth);

rolesRouter.get(
    '/',
    requirePermission('roles:manage', 'users:manage'),
    async (_req, res) => {
        const roles = await listRoles();
        res.json({ roles });
    },
);

rolesRouter.get(
    '/permissions',
    requirePermission('roles:manage', 'users:manage'),
    async (_req, res) => {
        const permissions = await listPermissions();
        res.json({ permissions });
    },
);

rolesRouter.post('/', requirePermission('roles:manage'), async (req, res) => {
    const body = createRoleSchema.safeParse(req.body);

    if (!body.success) {
        res.status(400).json({ error: 'Solicitud no válida' });
        return;
    }

    try {
        const role = await createRole(
            body.data.id,
            body.data.name,
            body.data.permissionIds,
        );

        res.status(201).json({ role });
    } catch (e) {
        if (handleRoleManageError(e, res)) return;

        throw e;
    }
});

rolesRouter.patch(
    '/:id/permissions',
    requirePermission('roles:manage'),
    async (req, res) => {
        const params = idParamSchema.safeParse(req.params);
        const body = permissionsBodySchema.safeParse(req.body);

        if (!params.success || !body.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        try {
            const role = await setRolePermissions(
                params.data.id,
                body.data.permissionIds,
            );

            res.json({ role });
        } catch (e) {
            if (handleRoleManageError(e, res)) return;

            throw e;
        }
    },
);

rolesRouter.delete(
    '/:id',
    requirePermission('roles:manage'),
    async (req, res) => {
        const params = idParamSchema.safeParse(req.params);

        if (!params.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        try {
            await deleteRole(params.data.id);
            res.status(204).end();
        } catch (e) {
            if (handleRoleManageError(e, res)) return;

            throw e;
        }
    },
);
