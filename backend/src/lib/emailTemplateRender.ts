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
    modality: string;
    // Solo lo rellena la convocatoria de reunión comarcal; el resto de
    // envíos (inscripción, cancelación...) no tienen motivo.
    motivo?: string;
    startsAt: Date;
    endsAt: Date;
    projectName: string;
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

const toGCalDate = (date: Date): string =>
    date.toISOString().replace(/[-:]|\.\d{3}/g, '');

const buildGoogleCalendarUrl = (event: RenderableEvent): string => {
    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: event.title,
        dates: `${toGCalDate(event.startsAt)}/${toGCalDate(event.endsAt)}`,
    });

    if (event.location) params.set('location', event.location);

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

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
    modalidad: (event) => event.modality,
    lugar: (event) =>
        escape ? escapeHtml(event.location ?? '') : (event.location ?? ''),
    // Ya es HTML saneado (sanitizeEmailHtml), no texto plano: no se escapa.
    motivo: (event) => event.motivo ?? '',
    // proyecto = nombre real del proyecto; evento = título de la sesión
    // concreta (pueden no coincidir: un proyecto tiene varias sesiones).
    proyecto: (event) =>
        escape ? escapeHtml(event.projectName) : event.projectName,
    evento: (event) => (escape ? escapeHtml(event.title) : event.title),
    calendarUrl: (event) => {
        const url = buildGoogleCalendarUrl(event);

        return escape ? escapeHtml(url) : url;
    },
});

// Para listar sesiones sueltas (aviso de evento nuevo, posible serie): solo
// números y meses en español, nunca contiene HTML, no hace falta escapar.
export const formatSessionDateTime = (startsAt: Date, endsAt: Date): string =>
    `${dateFormat.format(startsAt)}, de ${timeFormat.format(startsAt)} a ${timeFormat.format(endsAt)}`;

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

// Si el DT no escribe motivo, se quita el párrafo entero que lo contiene
// (no solo el texto) para no dejar un hueco en blanco en el correo.
const stripEmptyMotivoParagraph = (html: string): string =>
    html.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (match, inner: string) =>
        inner.replace(/<[^>]+>/g, '').trim() === '{{motivo}}' ? '' : match,
    );

// Con RichTextEditor, "no escribió nada" es HTML vacío (ej. '<p></p>'), no
// la cadena vacía literal.
const isMotivoEmpty = (motivo: string | undefined): boolean =>
    (motivo ?? '').replace(/<[^>]+>/g, '').trim() === '';

// Bloques condicionales por modalidad: {{#presencial}}...{{/presencial}} y
// {{#online}}...{{/online}} se quitan enteros (marcas incluidas) si la
// modalidad del evento no coincide.
const applyModalityConditionals = (html: string, modality: string): string =>
    html
        .replace(
            /\{\{#presencial\}\}([\s\S]*?)\{\{\/presencial\}\}/g,
            (_match, inner: string) =>
                modality === 'presencial' ? inner : '',
        )
        .replace(
            /\{\{#online\}\}([\s\S]*?)\{\{\/online\}\}/g,
            (_match, inner: string) => (modality === 'online' ? inner : ''),
        );

// Sustituye {{saludo}}, {{fecha}}, {{horaInicio}}, {{horaFin}}, {{lugar}} y
// {{proyecto}} tanto en el asunto como en el cuerpo de la plantilla.
export const renderEmail = (
    template: { subject: string; body: string },
    event: RenderableEvent,
): { subject: string; body: string } => {
    const bodyWithMotivo = isMotivoEmpty(event.motivo)
        ? stripEmptyMotivoParagraph(template.body)
        : template.body;
    const body = applyModalityConditionals(bodyWithMotivo, event.modality);
    const subject = applyModalityConditionals(
        template.subject,
        event.modality,
    );

    return {
        subject: applyPlaceholders(subject, event, SUBJECT_PLACEHOLDERS),
        body: applyPlaceholders(body, event, BODY_PLACEHOLDERS),
    };
};

// Para plantillas no atadas a un evento (inscripción, proyecto nuevo,
// mantenimiento): placeholders libres, {{clave}} -> valor ya formateado por
// quien llama. El valor se escapa en el cuerpo HTML salvo que su clave esté
// en rawKeys (HTML ya saneado por quien llama, p. ej. un campo de editor
// enriquecido); en el asunto nunca se escapa.
export const renderNotificationEmail = (
    template: { subject: string; body: string },
    data: Record<string, string>,
    rawKeys: string[] = [],
): { subject: string; body: string } => {
    const applyGeneric = (text: string, escape: boolean): string =>
        text.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
            const value = data[key];

            if (value === undefined) return match;

            return escape && !rawKeys.includes(key) ? escapeHtml(value) : value;
        });

    return {
        subject: applyGeneric(template.subject, false),
        body: applyGeneric(template.body, true),
    };
};
