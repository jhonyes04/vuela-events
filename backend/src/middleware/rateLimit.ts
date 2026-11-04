import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Demasiados intentos. Inténtolo de nuevo más tarde.' },
});

export const writeLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Demasiadas solicitudes. Inténtalo de nuevo más tarde.' },
    skip: (req) => req.method === 'GET',
    keyGenerator: (req) => req.session.userId ?? ipKeyGenerator(req.ip ?? ''),
});

export const readLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 300,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Demasiadas solicitudes. Inténtalo de nuevo más tarde.' },
    skip: (req) => req.method !== 'GET' || req.path.endsWith('/stream'),
    keyGenerator: (req) => req.session.userId ?? ipKeyGenerator(req.ip ?? ''),
});
