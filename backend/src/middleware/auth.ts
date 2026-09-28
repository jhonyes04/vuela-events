import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authUserSelect, toAuthUser, type AuthUser } from '../lib/authUser.js';

export type { AuthUser };

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
        select: authUserSelect,
    });

    if (!user || !user.active) {
        // La sesión apunta a un usuario que ya no existe: se invalida.
        await destroySession(req);

        res.status(401).json({ error: 'Autenticación requerida' });

        return;
    }

    req.user = toAuthUser(user);
    next();
};

// Para acciones que necesitan el nombre y el Punto Vuela (inscribirse, crear
// eventos: alimentan el acta de asistencia). Debe ir después de requireAuth.
export const requireCompleteProfile = (
    req: Request,
    res: Response,
    next: NextFunction,
): void => {
    if (!req.user) {
        res.status(401).json({ error: 'Autenticación requerida' });
        return;
    }

    if (!req.user.profileCompleted) {
        res.status(403).json({
            error: 'Completa tu perfil (nombre y Punto Vuela) antes de continuar',
        });
        return;
    }

    next();
};

export const requirePermission = (...required: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        const { user } = req;

        if (!user) {
            res.status(401).json({ error: 'Autenticación requerida' });
            return;
        }

        if (!required.some((code) => user.permissions.includes(code))) {
            res.status(403).json({
                error: 'No tienes permisos para esta acción',
            });
            return;
        }

        next();
    };
};
