import { api } from '@/lib/api';

export type SlotId =
    | 'convocatoria'
    | 'convocatoria_reunion'
    | 'parte_firmas'
    | 'inscripcion'
    | 'cancelacion_inscripcion'
    | 'proyecto_nuevo'
    | 'evento_nuevo'
    | 'evento_cancelado'
    | 'mantenimiento';

export interface SmtpConfig {
    host: string;
    port: number;
    secure: boolean;
}

export interface NoReplySmtpConfig {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    fromName: string;
}

export interface NoReplySmtpInput extends NoReplySmtpConfig {
    password?: string;
}

export interface TemplateAssignment {
    slot: SlotId;
    templateId: string | null;
}

export interface EmailSettings {
    smtpConfig: SmtpConfig | null;
    noReplySmtpConfig: NoReplySmtpConfig | null;
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

export const updateNoReplySmtpConfig = async (
    input: NoReplySmtpInput,
): Promise<NoReplySmtpConfig> => {
    const { noReplySmtpConfig } = await api.patch<{
        noReplySmtpConfig: NoReplySmtpConfig;
    }>('/email-settings/noreply-smtp', input);

    return noReplySmtpConfig;
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
