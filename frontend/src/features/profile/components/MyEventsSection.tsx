import { useEffect, useMemo, useState } from 'react';
import { FileDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { IconTooltip } from '@/components/IconTooltip';
import { Input } from '@/components/ui/input';
import { CATEGORY_COLOR_STYLES } from '@/features/categories/lib/colors';
import {
    formatShortDate,
    formatTime,
    hasEnded,
    listMyEvents,
    type EventItem,
} from '@/features/events/lib/events';
import {
    downloadSentReport,
    listSentReports,
    type SentReport,
} from '@/features/profile/lib/reports';
import { ApiError } from '@/lib/api';

type StatusFilter = 'all' | 'upcoming' | 'past';

const selectClass =
    'h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50';

// Sin tildes y en minúsculas, para que "taller" encuentre "Tállér".
const normalize = (text: string) =>
    text
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase();

// Eventos en los que está inscrita la persona, del más reciente al más antiguo.
export const MyEventsSection = () => {
    const [events, setEvents] = useState<EventItem[]>([]);
    const [reports, setReports] = useState<SentReport[]>([]);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [downloadError, setDownloadError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [status, setStatus] = useState<StatusFilter>('all');

    useEffect(() => {
        let cancelled = false;

        // Si falla la lista de partes, los eventos se ven igual (sin descarga).
        Promise.all([
            listMyEvents(),
            listSentReports().catch((): SentReport[] => []),
        ])
            .then(([list, sent]) => {
                if (cancelled) return;

                setEvents(list);
                setReports(sent);
            })
            .catch((e: unknown) => {
                if (!cancelled)
                    setError(
                        e instanceof ApiError
                            ? e.message
                            : 'No se pudieron cargar tus eventos',
                    );
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    // Categorías presentes en mis eventos (no requiere permiso de categorías).
    const categories = useMemo(() => {
        const byId = new Map(events.map((e) => [e.category.id, e.category]));

        return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
    }, [events]);

    // Último parte enviado de cada evento (la lista viene del más reciente al más antiguo).
    const reportByEvent = useMemo(() => {
        const byEvent = new Map<string, SentReport>();

        for (const report of reports) {
            if (!byEvent.has(report.event.id)) {
                byEvent.set(report.event.id, report);
            }
        }

        return byEvent;
    }, [reports]);

    const handleDownload = async (report: SentReport) => {
        setDownloadError(null);
        setDownloadingId(report.event.id);

        try {
            await downloadSentReport(report);
        } catch (e) {
            setDownloadError(
                e instanceof ApiError
                    ? e.message
                    : 'No se pudo descargar el parte de firmas',
            );
        } finally {
            setDownloadingId(null);
        }
    };

    const visible = useMemo(() => {
        const needle = normalize(query.trim());

        return events
            .filter((event) => {
                if (categoryId && event.category.id !== categoryId) {
                    return false;
                }

                if (status === 'upcoming' && hasEnded(event)) return false;
                if (status === 'past' && !hasEnded(event)) return false;

                if (!needle) return true;

                return normalize(
                    `${event.title} ${event.subtitle ?? ''} ${event.location ?? ''}`,
                ).includes(needle);
            })
            .sort((a, b) => b.startsAt.localeCompare(a.startsAt));
    }, [events, query, categoryId, status]);

    return (
        <div className="grid gap-4">
            <div className="grid gap-1">
                <h2 className="text-sm font-medium">Mis eventos</h2>
                <p className="text-sm text-muted-foreground">
                    Eventos en los que estás inscrito.
                </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                <Input
                    type="search"
                    value={query}
                    placeholder="Buscar por título, subtítulo o lugar"
                    aria-label="Buscar eventos"
                    onChange={(e) => setQuery(e.target.value)}
                />
                <select
                    className={selectClass}
                    value={categoryId}
                    aria-label="Filtrar por categoría"
                    onChange={(e) => setCategoryId(e.target.value)}
                >
                    <option value="">Todas las categorías</option>
                    {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.name}
                        </option>
                    ))}
                </select>
                <select
                    className={selectClass}
                    value={status}
                    aria-label="Filtrar por estado"
                    onChange={(e) => setStatus(e.target.value as StatusFilter)}
                >
                    <option value="all">Todos</option>
                    <option value="upcoming">Próximos</option>
                    <option value="past">Pasados</option>
                </select>
            </div>

            {downloadError && (
                <p role="alert" className="text-sm text-destructive">
                    {downloadError}
                </p>
            )}

            {loading ? (
                <p role="status" className="text-sm text-muted-foreground">
                    Cargando tus eventos…
                </p>
            ) : error ? (
                <p className="text-sm text-destructive">{error}</p>
            ) : visible.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    {events.length === 0
                        ? 'Todavía no estás inscrito en ningún evento.'
                        : 'Ningún evento coincide con la búsqueda.'}
                </p>
            ) : (
                <ul className="grid gap-2">
                    {visible.map((event) => {
                        const report = reportByEvent.get(event.id);

                        return (
                        <li
                            key={event.id}
                            className="flex items-center gap-3 rounded-lg border p-3"
                        >
                            <span
                                className={`size-3 shrink-0 rounded-full ${CATEGORY_COLOR_STYLES[event.category.color].swatch}`}
                            />
                            <div className="min-w-0 flex-1">
                                <p className="truncate font-medium">
                                    {event.title}
                                </p>
                                <p className="truncate text-sm text-muted-foreground">
                                    {formatShortDate(event.startsAt)} ·{' '}
                                    {formatTime(event.startsAt)}–
                                    {formatTime(event.endsAt)}
                                    {event.location && ` · ${event.location}`}
                                </p>
                            </div>
                            {hasEnded(event) && (
                                <Badge variant="secondary">Finalizado</Badge>
                            )}
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
                                            !report ||
                                            downloadingId === event.id
                                        }
                                        onClick={() =>
                                            report &&
                                            void handleDownload(report)
                                        }
                                    >
                                        <FileDown className="size-4" />
                                    </Button>
                                </span>
                            </IconTooltip>
                        </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};
