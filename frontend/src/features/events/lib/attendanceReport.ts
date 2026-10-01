import { requestFile } from '@/lib/api';

export interface GeneratedReport {
    draftId: string;
    filename: string;
    blob: Blob;
}

// Genera el acta de asistencia de las inscripciones elegidas. El servidor la
// guarda como borrador: el envío adjuntará exactamente este PDF.
export const generateAttendanceReport = async (
    eventId: string,
    registrationIds: string[],
): Promise<GeneratedReport> => {
    const { blob, filename, headers } = await requestFile(
        'POST',
        `/events/${eventId}/attendance-report`,
        'acta-asistencia.pdf',
        { recipientRegistrationIds: registrationIds },
    );

    return {
        draftId: headers.get('X-Report-Draft-Id') ?? '',
        filename,
        blob,
    };
};
