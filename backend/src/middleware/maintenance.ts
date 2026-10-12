import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { isMaintenanceModeActive } from '../services/appSettings.js';

// Rutas que deben seguir funcionando aunque la app esté en mantenimiento:
// auth (para que un superadmin pueda loguearse y /me sepa si lo es),
// health (monitorización) y el propio estado de mantenimiento.
const ALWAYS_ALLOWED_PREFIXES = [
    '/api/auth',
    '/api/health',
    '/api/maintenance-status',
];

export const maintenanceGate = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    if (ALWAYS_ALLOWED_PREFIXES.some((prefix) => req.path.startsWith(prefix))) {
        next();
        return;
    }

    if (!(await isMaintenanceModeActive())) {
        next();
        return;
    }

    const userId = req.session.userId;
    const user = userId
        ? await prisma.user.findUnique({
              where: { id: userId },
              select: { isSuperadmin: true, active: true },
          })
        : null;

    if (user?.active && user.isSuperadmin) {
        next();
        return;
    }

    res.status(503).json({ error: 'maintenance' });
};
