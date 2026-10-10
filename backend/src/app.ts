import express, {
    type NextFunction,
    type Request,
    type Response,
} from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env.js';
import { sessionMiddleware } from './middleware/session.js';
import { requireSameOrigin } from './middleware/csrf.js';
import { createAuthRouter, type TokenVerifier } from './routes/auth.js';
import { usersRouter } from './routes/users.js';
import { eventsRouter } from './routes/events.js';
import { profileRouter } from './routes/profile.js';
import { rolesRouter } from './routes/roles.js';
import { projectsRouter } from './routes/projects.js';
import { guidesRouter } from './routes/guides.js';
import { resourceLinkRouter } from './routes/resourceLinks.js';
import { documentRouter } from './routes/documents.js';
import { emailTemplatesRouter } from './routes/emailTemplates.js';
import { emailSettingsRouter } from './routes/emailSettings.js';
import { emailSendsRouter } from './routes/emailSends.js';
import { auditRouter } from './routes/audit.js';
import { statsRouter } from './routes/stats.js';
import { appSettingsRouter } from './routes/appSettings.js';
import { sessionsRouter } from './routes/sessions.js';
import { apiLimiter } from './middleware/rateLimit.js';

export interface AppOptions {
    // Solo para tests: sustituye la verificación real del token de Google.
    verifyToken?: TokenVerifier;
}

export function createApp(options: AppOptions = {}) {
    const app = express();

    if (env.TRUST_PROXY_HOPS > 0) {
        app.set('trust proxy', env.TRUST_PROXY_HOPS);
    }

    app.use(
        helmet({
            crossOriginResourcePolicy: { policy: 'same-site' },
        }),
    );
    app.use(
        cors({
            origin: env.FRONTEND_ORIGIN,
            credentials: true,
            methods: ['GET', 'POST', 'PATCH', 'DELETE'],
            allowedHeaders: ['Content-Type'],
            // Sin esto el navegador no puede leer estas cabeceras en peticiones
            // cross-origin (fetch las devuelve como null aunque el servidor las envíe).
            exposedHeaders: ['X-Report-Draft-Id', 'Content-Disposition'],
        }),
    );

    app.use(requireSameOrigin);

    // Documentos adjuntan el archivo en base64 dentro del JSON: necesitan más margen que el resto.
    app.use('/api/documents', express.json({ limit: '14mb' }));
    app.use(express.json({ limit: '500kb' }));

    app.use(sessionMiddleware);

    app.use('/api', apiLimiter);
    app.use('/api', (_req, res, next) => {
        res.set('Cache-Control', 'no-store');
        next();
    });
    app.use('/api/auth', createAuthRouter(options.verifyToken));
    app.use('/api/profile', profileRouter);
    app.use('/api/users', usersRouter);
    app.use('/api/roles', rolesRouter);
    app.use('/api/projects', projectsRouter);
    app.use('/api/guides', guidesRouter);
    app.use('/api/resource-links', resourceLinkRouter);
    app.use('/api/documents', documentRouter);
    app.use('/api/email-templates', emailTemplatesRouter);
    app.use('/api/email-settings', emailSettingsRouter);
    app.use('/api/email-sends', emailSendsRouter);
    app.use('/api/events', eventsRouter);
    app.use('/api/audit', auditRouter);
    app.use('/api/stats', statsRouter);
    app.use('/api/app-settings', appSettingsRouter);
    app.use('/api/sessions', sessionsRouter);

    app.get('/api/health', (_req, res) => {
        res.json({ status: 'ok' });
    });

    app.use((_req, res) => {
        res.status(404).json({ error: 'Recurso no encontrado' });
    });

    app.use(
        (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
            const status =
                typeof err === 'object' && err !== null && 'status' in err
                    ? Number(err.status)
                    : 500;

            if (status >= 400 && status < 500) {
                res.status(status).json({ error: 'Solicitud no válida' });
                return;
            }

            console.error(err);

            res.status(500).json({ error: 'Error interno del servidor' });
        },
    );

    return app;
}
