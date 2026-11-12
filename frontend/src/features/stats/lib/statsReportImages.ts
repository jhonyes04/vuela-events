import { requestFile } from '@/lib/api';
import type { SectionId } from '@/features/stats/lib/sections';
import type { EventStatusFilter } from '@/features/stats/lib/stats';

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
    status: EventStatusFilter,
    images: Partial<Record<SectionId, CapturedImage>>,
    kpiImages: KpiImages | null,
): Promise<GeneratedStatsReport> => {
    const { blob, filename } = await requestFile(
        'POST',
        '/stats/pdf-images',
        'estadisticas.pdf',
        { year, status, images, kpiImages: kpiImages ?? undefined },
    );

    return { filename, blob };
};
