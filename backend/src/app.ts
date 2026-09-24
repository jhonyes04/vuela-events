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
import { authRouter } from './routes/auth.js';
import { usersRouter } from './routes/users.js';
import { eventsRouter } from './routes/events.js';
import { apiLimiter } from './middleware/rateLimit.js';

export function createApp() {
    const app = express();

    app.use(helmet());
    app.use(
        cors({
            origin: env.FRONTEND_ORIGIN,
            credentials: true,
            methods: ['GET', 'POST', 'PATCH', 'DELETE'],
            allowedHeaders: ['Content-Type'],
        }),
    );

    app.use(requireSameOrigin);

    app.use(express.json({ limit: '10kb' }));

    app.use(sessionMiddleware);

    app.use('/api', apiLimiter);
    app.use('/api', (_req, res, next) => {
        res.set('Cache-Control', 'no-store');
        next();
    });
    app.use('/api/auth', authRouter);
    app.use('/api/users', usersRouter);
    app.use('/api/events', eventsRouter);

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
