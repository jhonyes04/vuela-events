const TZ = 'Europe/Madrid';

// Fecha+hora completa: auditoría y notificaciones
const dateTimeFormat = new Intl.DateTimeFormat('es-ES', {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
});

export const formatDateTime = (date: Date): string =>
    dateTimeFormat.format(date);

// Fecha+hora corta: sesiones activas y métricas
const shortDatetimeFormat = new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
});

export const formatShortDateTime = (date: Date): string =>
    shortDatetimeFormat.format(date);
