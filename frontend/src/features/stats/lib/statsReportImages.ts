import { requestFile } from '@/lib/api';
import type { SectionId } from '@/features/stats/lib/sections';

export interface CapturedImage {
    dataUrl: string;
    width: number;
    height: number;
}

export interface KpiImages {
    events: CapturedImage;
    attended: CapturedImage;
}

export interface GeneratedStatsReport {
    filename: string;
    blob: Blob;
}

export const generateStatsReportPdfFromImages = async (
    year: number | null,
    images: Partial<Record<SectionId, CapturedImage>>,
    kpiImages: KpiImages | null,
): Promise<GeneratedStatsReport> => {
    const { blob, filename } = await requestFile(
        'POST',
        '/stats/pdf-images',
        'estadisticas.pdf',
        { year, images, kpiImages: kpiImages ?? undefined },
    );

    return { filename, blob };
};
