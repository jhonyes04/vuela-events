import { prisma } from '../lib/prisma.js';

interface AuditEntry {
    action: string;
    actorId?: string;
    targetId?: string;
    oldValue?: string;
    newValue?: string;
}

// La auditoría de accesos falla abierta, un error aquí no debe bloquear el login
export const recordAudit = async (entry: AuditEntry): Promise<void> => {
    try {
        await prisma.auditLog.create({ data: entry });
    } catch (e) {
        console.error(`No se pudo registrar la auditoría (${entry.action}):`);
        e instanceof Error ? e.name : 'error desconocido';
    }
};

const auditLogSelect = {
    id: true,
    action: true,
    oldValue: true,
    newValue: true,
    createdAt: true,
    actor: { select: { id: true, name: true, lastName: true, email: true } },
    target: { select: { id: true, name: true, lastName: true, email: true } },
} as const;

// El histórico completo se filtra/ordena/pagina en el cliente, igual que
// usuarios o eventos: basta con acotar a lo más reciente.
export const listAuditLogs = () =>
    prisma.auditLog.findMany({
        select: auditLogSelect,
        orderBy: { createdAt: 'desc' },
        take: 1000,
    });

const AUDIT_RETENTION_DAYS = 30;

// Purga lo anterior a los últimos 30 días exactos.
export const pruneOldAuditLogs = async (): Promise<number> => {
    const cutoff = new Date(
        Date.now() - AUDIT_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    );

    const { count } = await prisma.auditLog.deleteMany({
        where: { createdAt: { lt: cutoff } },
    });

    return count;
};

// Borrado manual (uno o varios) desde la página de auditoría.
export const deleteAuditLogs = async (ids: string[]): Promise<number> => {
    const { count } = await prisma.auditLog.deleteMany({
        where: { id: { in: ids } },
    });

    return count;
};
