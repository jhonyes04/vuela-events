import { createCatalogStore } from '@/lib/createCatalogStore';
import {
    listEmailTemplates,
    type EmailTemplate,
} from '@/features/emailTemplates/lib/emailTemplates';

export const useEmailTemplatesStore =
    createCatalogStore<EmailTemplate>(listEmailTemplates);
