import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const allowedOrigin = new URL(env.FRONTEND_ORIGIN).origin;

export function requireSameOrigin(
    req: Request,
    res: Response,
    next: NextFunction,
): void {
    if (SAFE_METHODS.has(req.method)) {
        next();
        return;
    }

    if (req.get('Origin') !== allowedOrigin) {
        res.status(403).json({ error: 'Origen no permitido' });

        return;
    }

    next();
}
