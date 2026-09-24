import { randomBytes } from 'node:crypto';
import { Router, type Request } from 'express';
import { z } from 'zod';
import { env, isProd } from '../config/env.js';
import {
    LoginRejectedError,
    verifyGoogleIdToken,
    type GoogleIdentity,
} from '../lib/google.js';
import { requireAuth } from '../middleware/auth.js';
import { loginLimiter } from '../middleware/rateLimit.js';
import { SESSION_COOKIE } from '../middleware/session.js';
import { findOrCreateUser, LoginFailureError } from '../services/users.js';
import { recordAudit } from '../services/audit.js';

export type TokenVerifier = (
    credential: string,
    expectedNonce: string,
) => Promise<GoogleIdentity>;

// Vida de la sesión anónima que solo existe para completar el login.
const NONCE_TTL_MS = 10 * 60 * 1000;

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

// El verificador se inyecta solo desde createApp() (código), nunca por configuración:
// en producción siempre es la verificación real contra Google.
export const createAuthRouter = (
    verifyToken: TokenVerifier = verifyGoogleIdToken,
) => {
    const authRouter = Router();

    // Emite un nonce de un solo uso, atado a la sesión del navegador que lo pide.
    // Google lo incluye firmado en el id_token; el login exige que coincida.
    authRouter.get('/nonce', async (req, res) => {
        const nonce = randomBytes(32).toString('base64url');

        req.session.loginNonce = nonce;

        // Si aún no hay usuario, es una sesión anónima de vida corta.
        if (!req.session.userId) {
            req.session.cookie.maxAge = NONCE_TTL_MS;
        }

        await saveSession(req);

        res.json({ nonce });
    });

    authRouter.post('/google', loginLimiter, async (req, res) => {
        const parsed = loginSchema.safeParse(req.body);

        if (!parsed.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        // Se lee antes de regenerar la sesión. Sin nonce, la verificación falla.
        const expectedNonce = req.session.loginNonce ?? '';

        try {
            const identity = await verifyToken(
                parsed.data.credential,
                expectedNonce,
            );
            const user = await findOrCreateUser(identity);

            // Nueva sesión en cada login: evita fijación de sesión.
            await regenerateSession(req);
            req.session.userId = user.id;
            await saveSession(req);

            await recordAudit({ action: 'login_success', actorId: user.id });

            res.json({ user });
        } catch (e) {
            if (e instanceof LoginRejectedError) {
                console.warn(`Login rechazado: ${e.reason}`);

                await recordAudit({
                    action: 'login_rejected',
                    newValue: e.reason,
                });

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
                            : `Solo se permiten cuentas @${env.ALLOWED_EMAIL_DOMAIN}`,
                });

                return;
            }

            if (e instanceof LoginFailureError) {
                console.warn(`Login rechazado: ${e.reason}`);

                await recordAudit({
                    action: 'login_rejected',
                    newValue: e.reason,
                });

                res.status(403).json({
                    error:
                        e.reason === 'account_disabled'
                            ? 'Tu cuenta está desactivada. Contacta con un administrador.'
                            : 'No se puede iniciar sesión con esta cuenta. Contacta con un administrador.',
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

    return authRouter;
};
