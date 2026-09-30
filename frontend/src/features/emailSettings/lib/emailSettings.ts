import { api } from '@/lib/api';

export type SlotId = 'convocatoria' | 'parte_firmas';

export interface SmtpConfig {
    host: string;
    port: number;
    secure: boolean;
}

export interface TemplateAssignment {
    slot: SlotId;
    templateId: string | null;
}

export interface EmailSettings {
    smtpConfig: SmtpConfig | null;
    templateAssignments: TemplateAssignment[];
}

export const getEmailSettings = (): Promise<EmailSettings> =>
    api.get<EmailSettings>('/email-settings');

export const updateSmtpConfig = async (
    input: SmtpConfig,
): Promise<SmtpConfig> => {
    const { smtpConfig } = await api.patch<{ smtpConfig: SmtpConfig }>(
        '/email-settings/smtp',
        input,
    );

    return smtpConfig;
};

export const updateTemplateAssignment = async (
    slot: SlotId,
    templateId: string | null,
): Promise<TemplateAssignment> => {
    const { assignment } = await api.patch<{ assignment: TemplateAssignment }>(
        `/email-settings/template-assignment/${slot}`,
        { templateId },
    );

    return assignment;
};
