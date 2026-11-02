import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';

export type EmailLogOrigin = 'system' | 'user';

interface EmailLogEntry {
    to: string;
    subject: string;
    slot?: string;
    origin: EmailLogOrigin;
    senderId?: string;
    ok: boolean;
    error?: string;
}

// El log de envíos falla abierto, igual que la auditoría: un error aquí no
// debe romper el envío real del correo.
export const recordEmailLog = async (entry: EmailLogEntry): Promise<void> => {
    try {
        await prisma.emailLog.create({
            data: {
                to: entry.to.slice(0, 255),
                subject: entry.subject.slice(0, 200),
                slot: entry.slot?.slice(0, 40),
                origin: entry.origin,
                senderId: entry.senderId,
                ok: entry.ok,
                error: entry.error,
            },
        });
    } catch (e) {
        logger.error(
            { err: e, to: entry.to, slot: entry.slot },
            'No se pudo registrar el log de email',
        );
    }
};

const EMAIL_LOG_RETENTION_DAYS = 30;

// Purga los anteriores a los últimos 30 días
export const pruneOldEmailLogs = async (): Promise<number> => {
    const cutoff = new Date(
        Date.now() - EMAIL_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    );

    const { count } = await prisma.emailLog.deleteMany({
        where: { sentAt: { lt: cutoff } },
    });

    return count;
};
