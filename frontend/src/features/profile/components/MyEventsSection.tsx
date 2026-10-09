import { useEffect, useState } from 'react';
import { FileDown } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { IconTooltip } from '@/components/IconTooltip';
import { EventsTable } from '@/features/events/components/EventsTable';
import { listMyEvents, type EventItem } from '@/features/events/lib/events';
import {
    downloadSentReport,
    listSentReports,
    type SentReport,
} from '@/features/profile/lib/reports';
import { ApiError } from '@/lib/api';

// Eventos en los que está inscrita la persona, con el mismo comportamiento
// de filtros/orden/paginación que la gestión de eventos (EventsTable).
export const MyEventsSection = () => {
    const [events, setEvents] = useState<EventItem[]>([]);
    const [reports, setReports] = useState<SentReport[]>([]);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);

        try {
            // Si falla la lista de partes, los eventos se ven igual (sin descarga).
            const [list, sent] = await Promise.all([
                listMyEvents(),
                listSentReports().catch((): SentReport[] => []),
            ]);

            setEvents(list);
            setReports(sent);
        } catch (e) {
            setError(
                e instanceof ApiError
                    ? e.message
                    : 'No se pudieron cargar tus eventos',
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void Promise.resolve().then(load);
    }, []);

    // Último parte enviado de cada evento (la lista viene del más reciente al más antiguo).
    const reportByEvent = new Map<string, SentReport>();

    for (const report of reports) {
        if (!reportByEvent.has(report.event.id)) {
            reportByEvent.set(report.event.id, report);
        }
    }

    const handleDownload = async (report: SentReport) => {
        setDownloadingId(report.event.id);

        try {
            await downloadSentReport(report);
        } catch (e) {
            toast.error(
                e instanceof ApiError
                    ? e.message
                    : 'No se pudo descargar el parte de firmas',
            );
        } finally {
            setDownloadingId(null);
        }
    };

    return (
        <>
            <EventsTable
                events={events}
                loading={loading}
                error={error}
                onRetry={() => void load()}
                searchPlaceholder="Buscar por título o lugar…"
                matchesSearch={(event, q) =>
                    event.title.toLowerCase().includes(q) ||
                    (event.location?.toLowerCase().includes(q) ?? false)
                }
                defaultTimeFilter="future"
                renderActions={(event) => {
                    const report = reportByEvent.get(event.id);

                    return (
                        <IconTooltip
                            label={
                                report
                                    ? 'Descargar parte de firmas'
                                    : 'Parte de firmas no enviado'
                            }
                        >
                            {/* El span recibe el hover aunque el botón esté desactivado. */}
                            <span tabIndex={report ? -1 : 0}>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    aria-label={
                                        report
                                            ? 'Descargar parte de firmas'
                                            : 'Parte de firmas no enviado'
                                    }
                                    disabled={
                                        !report || downloadingId === event.id
                                    }
                                    onClick={() =>
                                        report && void handleDownload(report)
                                    }
                                >
                                    <FileDown className="size-4" />
                                </Button>
                            </span>
                        </IconTooltip>
                    );
                }}
            />
        </>
    );
};
