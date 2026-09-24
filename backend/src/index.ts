import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { sessionPool } from './middleware/session.js';
import { createApp } from './app.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
    console.log(`API escuchando en http://localhost:${env.PORT}`);
});

function shutdown(signal: string) {
    console.log(`${signal} recibido, cerrando...`);

    server.close(() => {
        void Promise.allSettled([
            prisma.$disconnect(),
            sessionPool.end(),
        ]).finally(() => process.exit(0));
    });

    setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
