import { Router, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { Prisma } from '../generated/prisma/client.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import {
    changeUserRole,
    RoleChangeError,
    setUserActive,
} from '../services/roles.js';

const paramsSchema = z.object({ id: z.uuid() });
const roleBodySchema = z.strictObject({
    roleId: z.string().trim().toLowerCase().min(1).max(40),
});

const activeBodySchema = z.strictObject({ active: z.boolean() });

const adminErrors = {
    forbidden: [403, 'No tienes permisos para esta acción'],
    not_found: [404, 'Usuario no encontrado'],
    self_change: [400, 'No puedes modificar tu propia cuenta'],
    last_manager: [
        409,
        'No puedes dejar el sistema sin nadie que pueda gestionar usuarios',
    ],
} as const;

const handleAdminError = (e: unknown, res: Response) => {
    if (e instanceof RoleChangeError) {
        const [status, error] = adminErrors[e.reason];

        res.status(status).json({ error });
        return true;
    }

    if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2034'
    ) {
        res.status(409).json({
            error: 'Conflicto simultáneo, inténtalo de nuevo',
        });

        return true;
    }

    return false;
};

export const usersRouter = Router();

// Todo lo que cuelga de este router exige el permiso de gestionar usuarios.
usersRouter.use(requireAuth, requirePermission('users:manage'));

usersRouter.get('/', async (_req, res) => {
    const users = await prisma.user.findMany({
        select: {
            id: true,
            email: true,
            name: true,
            active: true,
            createdAt: true,
            role: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'asc' },
        take: 500,
    });

    res.json({ users });
});

usersRouter.patch('/:id/role', async (req, res) => {
    const actor = req.user;

    if (!actor) {
        res.status(401).json({ error: 'Autenticación requerida' });
        return;
    }

    const params = paramsSchema.safeParse(req.params);
    const body = roleBodySchema.safeParse(req.body);

    if (!params.success || !body.success) {
        res.status(400).json({ error: 'Solicitud no válida' });
        return;
    }

    try {
        const user = await changeUserRole(
            actor.id,
            params.data.id,
            body.data.roleId,
        );

        res.json({ user });
    } catch (e) {
        if (handleAdminError(e, res)) return;

        throw e;
    }
});

usersRouter.patch('/:id/active', async (req, res) => {
    const actor = req.user;

    if (!actor) {
        res.status(401).json({ error: 'Autenticación requerida' });
        return;
    }

    const params = paramsSchema.safeParse(req.params);
    const body = activeBodySchema.safeParse(req.body);

    if (!params.success || !body.success) {
        res.status(400).json({ error: 'Solicitud no válida' });
        return;
    }

    try {
        const user = await setUserActive(
            actor.id,
            params.data.id,
            body.data.active,
        );

        res.json({ user });
    } catch (e) {
        if (handleAdminError(e, res)) return;

        throw e;
    }
});
