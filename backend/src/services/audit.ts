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
