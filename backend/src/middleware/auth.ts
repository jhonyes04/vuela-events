import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import type { Role } from '../generated/prisma/client.js';

export interface AuthUser {
    id: string;
    email: string;
    name: string;
    role: Role;
}

declare global {
    namespace Express {
        interface Request {
            user?: AuthUser;
        }
    }
}

const destroySession = (req: Request): Promise<void> => {
    return new Promise((resolve) => {
        req.session.destroy(() => resolve());
    });
};

export const requireAuth = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    const userId = req.session.userId;

    if (!userId) {
        res.status(401).json({ error: 'Autenticación requerida' });
        return;
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, role: true, active: true },
    });

    if (!user || !user.active) {
        // La sesión apunta a un usuario que ya no existe: se invalida.
        await destroySession(req);

        res.status(401).json({ error: 'Autenticación requerida' });

        return;
    }

    req.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
    };
    next();
};

export const requireRole = (...allowed: Role[]) => {
    const allowedRoles = new Set<Role>(allowed);

    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ error: 'Autenticación requerida' });
            return;
        }

        if (!allowedRoles.has(req.user.role)) {
            res.status(403).json({
                error: 'No tienes permisos para esta acción',
            });
            return;
        }

        next();
    };
};
