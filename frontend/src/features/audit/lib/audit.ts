import { api } from '@/lib/api';

export interface AuditUserRef {
    id: string;
    name: string;
    lastName: string;
    email: string;
}

export interface AuditLogEntry {
    id: string;
    action: string;
    oldValue: string | null;
    newValue: string | null;
    createdAt: string;
    actor: AuditUserRef | null;
    target: AuditUserRef | null;
}

const ACTION_LABELS: Record<string, string> = {
    login_success: 'Inicio de sesión',
    login_rejected: 'Inicio de sesión rechazado',
    profile_completed: 'Perfil completado',
    profile_updated: 'Perfil actualizado',
    role_change: 'Rol de usuario cambiado',
    active_change: 'Usuario activado/desactivado',
    user_deleted: 'Usuario eliminado',
    event_created: 'Evento creado',
    event_updated: 'Evento editado',
    event_deleted: 'Evento eliminado',
    event_series_created: 'Serie de eventos creada',
    event_series_deleted: 'Serie de eventos eliminada',
    event_registered: 'Inscripción en evento',
    event_unregistered: 'Baja de inscripción',
    category_created: 'Categoría creada',
    category_updated: 'Categoría editada',
    category_deleted: 'Categoría eliminada',
    guide_created: 'Guía creada',
    guide_updated: 'Guía editada',
    guide_deleted: 'Guía eliminada',
    email_template_created: 'Plantilla de correo creada',
    email_template_updated: 'Plantilla de correo editada',
    email_template_deleted: 'Plantilla de correo eliminada',
    role_created: 'Rol creado',
    role_permissions_changed: 'Permisos de rol cambiados',
    role_deleted: 'Rol eliminado',
    smtp_config_updated: 'Configuración SMTP actualizada',
    email_template_assigned: 'Plantilla asignada a envío',
    audit_log_deleted: 'Registros de auditoría eliminados',
};

export const actionLabel = (action: string): string =>
    ACTION_LABELS[action] ?? action;

export const auditPersonLabel = (user: AuditUserRef | null): string =>
    user ? `${user.name} ${user.lastName}`.trim() : 'Cuenta eliminada';

export const listAuditLogs = async (): Promise<AuditLogEntry[]> => {
    const { logs } = await api.get<{ logs: AuditLogEntry[] }>('/audit');

    return logs;
};

export const deleteAuditLogs = (ids: string[]): Promise<void> =>
    api.delete('/audit', { ids });
