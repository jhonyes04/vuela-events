import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api';
import { generateAttendanceReport } from '@/features/events/lib/attendanceReport';

export interface ReportDraft {
    id: string;
    // URL local del PDF, para visualizarlo.
    url: string;
    filename: string;
}

// Borrador del parte de firmas: se genera, se visualiza y después se envía.
export const useReportDraft = (eventId: string) => {
    const [draft, setDraft] = useState<ReportDraft | null>(null);
    const [generating, setGenerating] = useState(false);
    const urlRef = useRef<string | null>(null);

    const revoke = () => {
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);

        urlRef.current = null;
    };

    // Libera el PDF en memoria al cerrar el diálogo.
    useEffect(() => revoke, []);

    const clear = useCallback(() => {
        revoke();
        setDraft(null);
    }, []);

    const generate = async (registrationIds: string[]): Promise<boolean> => {
        setGenerating(true);

        try {
            const report = await generateAttendanceReport(
                eventId,
                registrationIds,
            );

            revoke();
            urlRef.current = URL.createObjectURL(report.blob);
            setDraft({
                id: report.draftId,
                url: urlRef.current,
                filename: report.filename,
            });

            return true;
        } catch (e) {
            toast.error(
                e instanceof ApiError
                    ? e.message
                    : 'No se pudo generar el parte de firmas',
            );

            return false;
        } finally {
            setGenerating(false);
        }
    };

    return { draft, generating, generate, clear };
};
