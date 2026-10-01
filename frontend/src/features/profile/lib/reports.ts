import { api, downloadFile } from '@/lib/api';
import type { CategoryColor } from '@/features/categories/lib/colors';

export interface SentReport {
    id: string;
    filename: string;
    createdAt: string;
    sentByMe: boolean;
    sender: { name: string; puntoVuela: string | null };
    event: {
        id: string;
        title: string;
        startsAt: string;
        endsAt: string;
        location: string | null;
        category: { id: string; name: string; color: CategoryColor };
    };
}

export const listSentReports = async (): Promise<SentReport[]> => {
    const { reports } = await api.get<{ reports: SentReport[] }>(
        '/profile/reports',
    );

    return reports;
};

export const downloadSentReport = (report: SentReport): Promise<void> =>
    downloadFile(`/profile/reports/${report.id}/pdf`, report.filename);
