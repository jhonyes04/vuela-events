import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { sessionPool } from './middleware/session.js';
import { createApp } from './app.js';
import { logger } from './lib/logger.js';
import { pruneOldAuditLogs } from './services/audit.js';

const app = createApp();

const DAY_MS = 24 * 60 * 60 * 1000;

const runAuditRetention = () => {
    void pruneOldAuditLogs()
        .then((count) => {
            if (count > 0) {
                logger.info(
                    { count },
                    `Auditoría: ${count} registro${count === 1 ? '' : 's'} antiguo${count === 1 ? '' : 's'} eliminado${count === 1 ? '' : 's'}.`,
                );
            }
        })
        .catch((e) =>
            logger.error({ err: e }, 'No se pudo limpiar la auditoría'),
        );
};

runAuditRetention();
setInterval(runAuditRetention, DAY_MS).unref();

const server = app.listen(env.PORT, env.HOST, () => {
    logger.info(`API escuchando en http://${env.HOST}:${env.PORT}`);
});

server.headersTimeout = 15_000;
server.requestTimeout = 30_000;

function shutdown(signal: string) {
    logger.info(`${signal} recibido, cerrando...`);

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
