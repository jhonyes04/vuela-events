import { randomUUID } from 'node:crypto';

// El borrador caduca solo: da tiempo de revisarlo y enviarlo, y no se acumula.
const DRAFT_TTL_MS = 30 * 60 * 1000;

export interface ReportDraft {
    id: string;
    eventId: string;
    senderId: string;
    // Inscripciones incluidas en el acta: el envío debe ser a esas mismas.
    registrationIds: string[];
    filename: string;
    pdf: Buffer;
}

// En memoria, como los jobs de envío: si el servidor se reinicia hay que
// volver a generar el acta (asumible, es un paso de pocos segundos).
const drafts = new Map<string, ReportDraft>();

export const createReportDraft = (
    input: Omit<ReportDraft, 'id'>,
): ReportDraft => {
    // Cada persona tiene un solo borrador por evento: el nuevo sustituye al anterior.
    for (const [id, draft] of drafts) {
        if (
            draft.senderId === input.senderId &&
            draft.eventId === input.eventId
        ) {
            drafts.delete(id);
        }
    }

    const draft: ReportDraft = { id: randomUUID(), ...input };

    drafts.set(draft.id, draft);
    setTimeout(() => drafts.delete(draft.id), DRAFT_TTL_MS).unref();

    return draft;
};

// Solo quien lo generó puede verlo o enviarlo.
export const getReportDraft = (
    id: string,
    senderId: string,
    eventId: string,
): ReportDraft | undefined => {
    const draft = drafts.get(id);

    return draft && draft.senderId === senderId && draft.eventId === eventId
        ? draft
        : undefined;
};

export const deleteReportDraft = (id: string): void => {
    drafts.delete(id);
};
