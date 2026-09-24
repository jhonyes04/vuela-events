import { Router, type Request } from 'express';
import { z } from 'zod';
import { env, isProd } from '../config/env.js';
import { LoginRejectedError, verifyGoogleIdToken } from '../lib/google.js';
import { requireAuth } from '../middleware/auth.js';
import { loginLimiter } from '../middleware/rateLimit.js';
import { SESSION_COOKIE } from '../middleware/session.js';
import { findOrCreateUser, LoginFailureError } from '../services/users.js';

const loginSchema = z.strictObject({
    credential: z.string().min(20).max(4096),
});

const regenerateSession = (req: Request): Promise<void> =>
    new Promise((resolve, reject) => {
        req.session.regenerate((err) => (err ? reject(err) : resolve()));
    });

const saveSession = (req: Request): Promise<void> =>
    new Promise((resolve, reject) => {
        req.session.save((err) => (err ? reject(err) : resolve()));
    });

export const authRouter = Router();

authRouter.post('/google', loginLimiter, async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
        res.status(400).json({ error: 'Solicitud no válida' });
        return;
    }

    try {
        const identity = await verifyGoogleIdToken(parsed.data.credential);
        const user = await findOrCreateUser(identity);

        // Nueva sesión en cada login: evita fijación de sesión.
        await regenerateSession(req);
        req.session.userId = user.id;
        await saveSession(req);

        res.json({ user });
    } catch (e) {
        if (e instanceof LoginRejectedError) {
            console.warn(`Login rechazado: ${e.reason}`);

            if (e.reason === 'invalid_token') {
                res.status(401).json({
                    error: 'Credencial de Google no válida',
                });
                return;
            }

            res.status(403).json({
                error:
                    e.reason === 'unverified_email'
                        ? 'Tu correo de Google no está verificado'
                        : `Solo se permite cuentas #${env.ALLOWED_EMAIL_DOMAIN}`,
            });

            return;
        }

        if (e instanceof LoginFailureError) {
            console.warn(`Login rechazado: ${e.reason}`);

            res.status(403).json({
                error:
                    e.reason === 'account_disabled'
                        ? 'Tu cuenta está desactivada. Contacta con un administrador.'
                        : 'No se puede iniciar sesión con esta cuenta. Contacta con un administrador',
            });

            return;
        }
        throw e;
    }
});

authRouter.get('/me', requireAuth, (req, res) => {
    res.json({ user: req.user });
});

authRouter.post('/logout', (req, res, next) => {
    req.session.destroy((err) => {
        if (err) {
            next(err);
            return;
        }

        res.clearCookie(SESSION_COOKIE, {
            httpOnly: true,
            secure: isProd,
            sameSite: 'lax',
        });

        res.status(204).end();
    });
});
