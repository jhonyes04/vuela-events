import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api';
import {
    generateStatsReportPdfFromImages,
    type CapturedImage,
    type KpiImages,
} from '@/features/stats/lib/statsReportImages';
import type { SectionId } from '@/features/stats/lib/sections';

export interface StatsReportDraft {
    url: string;
    filename: string;
}

// Genera el PDF de estadísticas (a partir de las capturas de los gráficos
// reales) y lo deja en memoria para visualizarlo. generateFromImages es
// estable (useCallback): StatsCaptureView la usa como dependencia de un
// efecto y no debe re-dispararse en cada render.
export const useStatsReportDraft = () => {
    const [draft, setDraft] = useState<StatsReportDraft | null>(null);
    const [generating, setGenerating] = useState(false);
    const urlRef = useRef<string | null>(null);

    const revoke = useCallback(() => {
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);

        urlRef.current = null;
    }, []);

    // Libera el PDF en memoria al desmontar.
    useEffect(() => revoke, [revoke]);

    const generateFromImages = useCallback(
        async (
            year: number | null,
            images: Partial<Record<SectionId, CapturedImage>>,
            kpiImages: KpiImages | null,
        ): Promise<boolean> => {
            setGenerating(true);

            try {
                const report = await generateStatsReportPdfFromImages(
                    year,
                    images,
                    kpiImages,
                );

                revoke();
                urlRef.current = URL.createObjectURL(report.blob);
                setDraft({ url: urlRef.current, filename: report.filename });

                return true;
            } catch (e) {
                toast.error(
                    e instanceof ApiError
                        ? e.message
                        : 'No se pudo generar el PDF',
                );

                return false;
            } finally {
                setGenerating(false);
            }
        },
        [revoke],
    );

    const clear = useCallback(() => {
        revoke();
        setDraft(null);
    }, [revoke]);

    return { draft, generating, generateFromImages, clear };
};
