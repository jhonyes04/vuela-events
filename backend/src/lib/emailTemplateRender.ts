const TZ = 'Europe/Madrid';

const dateFormat = new Intl.DateTimeFormat('es-ES', {
    timeZone: TZ,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
});

const timeFormat = new Intl.DateTimeFormat('es-ES', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
});

const hourFormat = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    hour: 'numeric',
    hourCycle: 'h23',
});

const hourInMadrid = (date: Date): number =>
    Number(
        hourFormat.formatToParts(date).find((p) => p.type === 'hour')?.value ??
            0,
    );

export interface RenderableEvent {
    title: string;
    location: string | null;
    startsAt: Date;
    endsAt: Date;
}

const HTML_ESCAPES: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
};

const escapeHtml = (s: string): string =>
    s.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c] ?? c);

// title/location vienen de un evento y pueden contener cualquier texto:
// se escapan al insertarse en el cuerpo HTML, pero no en el asunto (texto plano).
const buildPlaceholders = (
    escape: boolean,
): Record<string, (event: RenderableEvent) => string> => ({
    saludo: (event) =>
        hourInMadrid(event.startsAt) < 14 ? 'Buenos días' : 'Buenas tardes',
    fecha: (event) => dateFormat.format(event.startsAt),
    horaInicio: (event) => timeFormat.format(event.startsAt),
    horaFin: (event) => timeFormat.format(event.endsAt),
    lugar: (event) =>
        escape ? escapeHtml(event.location ?? '') : event.location ?? '',
    proyecto: (event) => (escape ? escapeHtml(event.title) : event.title),
});

const SUBJECT_PLACEHOLDERS = buildPlaceholders(false);
const BODY_PLACEHOLDERS = buildPlaceholders(true);

const applyPlaceholders = (
    text: string,
    event: RenderableEvent,
    placeholders: Record<string, (event: RenderableEvent) => string>,
): string =>
    text.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
        const resolve = placeholders[key];

        return resolve ? resolve(event) : match;
    });

// Sustituye {{saludo}}, {{fecha}}, {{horaInicio}}, {{horaFin}}, {{lugar}} y
// {{proyecto}} tanto en el asunto como en el cuerpo de la plantilla.
export const renderEmail = (
    template: { subject: string; body: string },
    event: RenderableEvent,
): { subject: string; body: string } => ({
    subject: applyPlaceholders(template.subject, event, SUBJECT_PLACEHOLDERS),
    body: applyPlaceholders(template.body, event, BODY_PLACEHOLDERS),
});
