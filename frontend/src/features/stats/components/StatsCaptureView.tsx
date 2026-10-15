import { useEffect, useRef } from 'react';
import { toPng } from 'html-to-image';
import { CalendarDays, Users } from 'lucide-react';
import { Kpi } from '@/features/stats/components/StatsChartKit';
import { EventsSection } from '@/features/stats/components/EventsSection';
import { RegistrationsSection } from '@/features/stats/components/RegistrationsSection';
import { OccupancySection } from '@/features/stats/components/OccupancySection';
import { AttendedSection } from '@/features/stats/components/AttendedSection';
import { UsersSection } from '@/features/stats/components/UsersSection';
import { ProjectsSection } from '@/features/stats/components/ProjectsSection';
import type { StatsSummary } from '@/features/stats/lib/stats';
import type { SectionId } from '@/features/stats/lib/sections';
import type {
    CapturedImage,
    KpiImages,
} from '@/features/stats/lib/statsReportImages';

interface StatsCaptureViewProps {
    sections: SectionId[];
    stats: StatsSummary;
    onCaptured: (
        images: Partial<Record<SectionId, CapturedImage>>,
        kpiImages: KpiImages | null,
    ) => void;
    onError: (message: string) => void;
}

const renderSection = (id: SectionId, stats: StatsSummary) => {
    switch (id) {
        case 'events-month':
        case 'events-quarter':
        case 'events-year':
        case 'events-status':
        case 'events-project':
            return <EventsSection section={id} stats={stats} />;
        case 'reg-month':
        case 'reg-project':
            return <RegistrationsSection section={id} stats={stats} />;
        case 'occupancy':
            return <OccupancySection stats={stats} />;
        case 'attended-month':
        case 'attended-quarter':
        case 'attended-year':
        case 'attended-total':
        case 'attended-project':
            return <AttendedSection section={id} stats={stats} />;
        case 'users-all':
        case 'users-interest-project':
        case 'users-top':
            return <UsersSection section={id} stats={stats} />;
        case 'project-participants':
        case 'project-user-participations':
            return <ProjectsSection section={id} stats={stats} />;
        case 'pending':
            return null;
        default:
            return null;
    }
};

// Monta fuera de pantalla los gráficos reales (Recharts/shadcn) para
// capturarlos como PNG tal cual se ven, y pegarlos así en el PDF en vez de
// reimplementarlos a mano con pdfkit.
export const StatsCaptureView = ({
    sections,
    stats,
    onCaptured,
    onError,
}: StatsCaptureViewProps) => {
    const refs = useRef<Partial<Record<SectionId, HTMLDivElement | null>>>({});
    const kpiEventsRef = useRef<HTMLDivElement | null>(null);
    const kpiAttendedRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        let cancelled = false;

        const captureKpi = async (
            el: HTMLDivElement | null,
        ): Promise<CapturedImage | null> => {
            if (!el) return null;

            const dataUrl = await toPng(el, {
                pixelRatio: 2,
                backgroundColor: '#ffffff',
            });

            return { dataUrl, width: el.offsetWidth, height: el.offsetHeight };
        };

        const run = async () => {
            // Recharts anima la entrada; se espera a que termine antes de capturar.
            await new Promise((resolve) => setTimeout(resolve, 900));

            const eventsImage = await captureKpi(kpiEventsRef.current);
            const attendedImage = await captureKpi(kpiAttendedRef.current);
            const kpiImages: KpiImages | null =
                eventsImage && attendedImage
                    ? { events: eventsImage, attended: attendedImage }
                    : null;

            const images: Partial<Record<SectionId, CapturedImage>> = {};

            for (const id of sections) {
                const el = refs.current[id];

                if (!el) continue;

                // El donut de estado anima el ángulo de las porciones y
                // tarda más que el resto en terminar; solo él necesita este
                // margen extra.
                if (id === 'events-status') {
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                }

                const dataUrl = await toPng(el, {
                    pixelRatio: 2,
                    backgroundColor: '#ffffff',
                });

                images[id] = {
                    dataUrl,
                    width: el.offsetWidth,
                    height: el.offsetHeight,
                };
            }

            if (!cancelled) onCaptured(images, kpiImages);
        };

        run().catch(() => {
            if (!cancelled) onError('No se pudieron capturar los gráficos');
        });

        return () => {
            cancelled = true;
        };
    }, [sections, stats, onCaptured, onError]);

    return (
        <div
            aria-hidden
            className="fixed top-0 -left-[10000px] w-[860px] bg-background"
        >
            <div ref={kpiEventsRef} className="w-60">
                <Kpi
                    icon={CalendarDays}
                    label="Eventos"
                    value={String(stats.totals.events)}
                    series={stats.eventsByMonth}
                    color="var(--chart-1)"
                />
            </div>
            <div ref={kpiAttendedRef} className="w-60">
                <Kpi
                    icon={Users}
                    label="Atendidos"
                    value={String(stats.totals.attended)}
                    series={stats.attendedByMonth}
                    color="var(--chart-3)"
                />
            </div>
            {sections.map((id) => (
                <div
                    key={id}
                    ref={(el) => {
                        refs.current[id] = el;
                    }}
                >
                    {renderSection(id, stats)}
                </div>
            ))}
        </div>
    );
};
