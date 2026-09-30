import { prisma } from '../lib/prisma.js';

const SMTP_CONFIG_ID = 'default';

// Huecos de envío conocidos por el código (los botones de "Enviar..." están
// escritos a mano); la plantilla asignada a cada uno sí es dato, no código.
export const SLOT_IDS = ['convocatoria', 'parte_firmas'] as const;
export type SlotId = (typeof SLOT_IDS)[number];

export type EmailSettingsFailure = 'not_found';

export class EmailSettingsError extends Error {
    readonly reason: EmailSettingsFailure;

    constructor(reason: EmailSettingsFailure) {
        super(reason);

        this.name = 'EmailSettingsError';
        this.reason = reason;
    }
}

const smtpConfigSelect = { host: true, port: true, secure: true } as const;

export const getSmtpConfig = () =>
    prisma.smtpConfig.findUnique({
        where: { id: SMTP_CONFIG_ID },
        select: smtpConfigSelect,
    });

export const setSmtpConfig = (input: {
    host: string;
    port: number;
    secure: boolean;
}) =>
    prisma.smtpConfig.upsert({
        where: { id: SMTP_CONFIG_ID },
        create: { id: SMTP_CONFIG_ID, ...input },
        update: input,
        select: smtpConfigSelect,
    });

export const getTemplateAssignments = async (): Promise<
    { slot: SlotId; templateId: string | null }[]
> => {
    const rows = await prisma.emailTemplateAssignment.findMany({
        select: { slot: true, templateId: true },
    });
    const bySlot = new Map(rows.map((r) => [r.slot, r.templateId]));

    return SLOT_IDS.map((slot) => ({
        slot,
        templateId: bySlot.get(slot) ?? null,
    }));
};

export const setTemplateAssignment = async (
    slot: SlotId,
    templateId: string | null,
) => {
    if (templateId) {
        const exists = await prisma.emailTemplate.findUnique({
            where: { id: templateId },
        });

        if (!exists) {
            throw new EmailSettingsError('not_found');
        }
    }

    return prisma.emailTemplateAssignment.upsert({
        where: { slot },
        create: { slot, templateId },
        update: { templateId },
        select: { slot: true, templateId: true },
    });
};
