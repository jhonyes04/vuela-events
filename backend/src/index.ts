import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { sessionPool } from './middleware/session.js';
import { createApp } from './app.js';
import { logger } from './lib/logger.js';
import { pruneOldAuditLogs } from './services/audit.js';
import { pruneOldEmailLogs } from './services/emailLog.js';
import { sendDueEventReminders } from './services/eventReminder.js';
import { pruneOldNotifications } from './services/notification.js';
import { runScheduleSurveys } from './services/survey.js';

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

const runEmailLogRetention = () => {
    void pruneOldEmailLogs()
        .then((count) => {
            if (count > 0) {
                logger.info(
                    { count },
                    `Log de emails: ${count} registro${count === 1 ? '' : 's'} antiguo${count === 1 ? '' : 's'} eliminado${count === 1 ? '' : 's'}.`,
                );
            }
        })
        .catch((e) =>
            logger.error({ err: e }, 'No se pudo limpiar el log de emails'),
        );
};

runEmailLogRetention();
setInterval(runEmailLogRetention, DAY_MS).unref();

const runNotificationRetention = () => {
    void pruneOldNotifications()
        .then((count) => {
            if (count > 0) {
                logger.info(
                    { count },
                    `Notificaciones: ${count} antigua${count === 1 ? '' : 's'} eliminada${count === 1 ? '' : 's'}.`,
                );
            }
        })
        .catch((e) =>
            logger.error({ err: e }, 'No se pudo limpiar las notificaciones'),
        );
};

runNotificationRetention();
setInterval(runNotificationRetention, DAY_MS).unref();

const FIVE_MIN_MS = 5 * 60 * 1000;

const runEventReminders = () => {
    void sendDueEventReminders()
        .then((count) => {
            if (count > 0) {
                logger.info(
                    { count },
                    `Recordatorios: ${count} aviso${count === 1 ? '' : 's'} enviado${count === 1 ? '' : 's'}`,
                );
            }
        })
        .catch((e) =>
            logger.error(
                { err: e },
                'No se pudo enviar recordatorios de evento',
            ),
        );
};

runEventReminders();
setInterval(runEventReminders, FIVE_MIN_MS).unref();

const runScheduledSurveys = () => {
    void runScheduleSurveys()
        .then(({ activated, closed }) => {
            if (activated > 0 || closed > 0) {
                logger.info(
                    { activated, closed },
                    `Encuestas programadas: ${activated} activada${activated === 1 ? '' : 's'}, ${closed} cerrada${closed === 1 ? '' : 's'}.`,
                );
            }
        })
        .catch((e) =>
            logger.error(
                { err: e },
                'No se pudo procesar las encuestas programadas',
            ),
        );
};

runScheduledSurveys();
setInterval(runScheduledSurveys, FIVE_MIN_MS).unref();

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
