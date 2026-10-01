import { api } from '@/lib/api';
import type { SlotId } from '@/features/emailSettings/lib/emailSettings';

export interface StartSendInput {
    slot: SlotId;
    eventId: string;
    recipientRegistrationIds: string[];
    // Acta generada y revisada antes del envío (obligatoria en 'parte_firmas').
    reportDraftId?: string;
}

// El servidor lo dice así cuando el acta caducó o los destinatarios cambiaron.
export const isStaleDraftMessage = (message: string): boolean =>
    message.includes('genéralo de nuevo');

export const startBulkSend = async (input: StartSendInput): Promise<string> => {
    const { jobId } = await api.post<{ jobId: string }>('/email-sends', input);

    return jobId;
};

export interface SendRecipientResult {
    registrationId: string;
    ok: boolean;
    error?: string;
}

export interface SendJobStatus {
    id: string;
    total: number;
    sent: number;
    failed: number;
    done: boolean;
    results: SendRecipientResult[];
}

export const getSendJobStatus = async (
    jobId: string,
): Promise<SendJobStatus> => {
    const { job } = await api.get<{ job: SendJobStatus }>(
        `/email-sends/${jobId}`,
    );

    return job;
};
