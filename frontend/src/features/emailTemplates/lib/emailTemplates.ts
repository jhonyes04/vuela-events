import { api } from '@/lib/api';

export type EmailTemplateCategory = 'dinamizacion' | 'administracion';

export interface EmailTemplate {
    id: string;
    name: string;
    subject: string;
    body: string;
    active: boolean;
    category: EmailTemplateCategory;
}

export interface EmailTemplateInput {
    name: string;
    subject: string;
    body: string;
    // Solo lo usa el backend si el actor es admin.
    category?: EmailTemplateCategory;
}

export interface EmailTemplateUpdateInput extends EmailTemplateInput {
    active: boolean;
}

export const listEmailTemplates = async (): Promise<EmailTemplate[]> => {
    const { templates } = await api.get<{ templates: EmailTemplate[] }>(
        '/email-templates',
    );

    return templates;
};

export const createEmailTemplate = async (
    input: EmailTemplateInput,
): Promise<EmailTemplate> => {
    const { template } = await api.post<{ template: EmailTemplate }>(
        '/email-templates',
        input,
    );

    return template;
};

export const updateEmailTemplate = async (
    id: string,
    input: EmailTemplateUpdateInput,
): Promise<EmailTemplate> => {
    const { template } = await api.patch<{ template: EmailTemplate }>(
        `/email-templates/${id}`,
        input,
    );

    return template;
};

export const deleteEmailTemplate = async (id: string): Promise<void> =>
    api.delete(`/email-templates/${id}`);
