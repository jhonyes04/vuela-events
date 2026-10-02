import { useEffect, useState } from 'react';
import { Pencil, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IconTooltip } from '@/components/IconTooltip';
import { AttendeesDialog } from '@/features/events/components/AttendeesDialog';
import { EventEditDialog } from '@/features/events/components/CreateEventDialog';
import { EventsTable } from '@/features/events/components/EventsTable';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { ApiError } from '@/lib/api';
import {
    deleteEventById,
    listAllEvents,
    type EventItem,
} from '@/features/events/lib/events';

export const EventsManagementPage = () => {
    const [events, setEvents] = useState<EventItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editOpen, setEditOpen] = useState(false);
    const [editing, setEditing] = useState<EventItem | null>(null);
    const [deleting, setDeleting] = useState<EventItem | null>(null);
    const [attendeesOpen, setAttendeesOpen] = useState(false);
    const [viewingAttendees, setViewingAttendees] = useState<EventItem | null>(
        null,
    );

    const load = async () => {
        setLoading(true);
        setError(null);

        try {
            setEvents(await listAllEvents());
        } catch (e) {
            setError(
                e instanceof ApiError
                    ? e.message
                    : 'No se pudo cargar la lista',
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void Promise.resolve().then(load);
    }, []);

    const openEdit = (event: EventItem) => {
        setEditing(event);
        setEditOpen(true);
    };

    const openAttendees = (event: EventItem) => {
        setViewingAttendees(event);
        setAttendeesOpen(true);
    };

    return (
        <section>
            <h1 className="mb-6 text-2xl font-semibold">Eventos</h1>

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
                showCapacity
                renderActions={(event) => (
                    <>
                        <IconTooltip label="Ver participantes">
                            <Button
                                variant="default"
                                size="icon"
                                aria-label="Ver participantes"
                                onClick={() => openAttendees(event)}
                            >
                                <Users className="size-4" />
                            </Button>
                        </IconTooltip>
                        <IconTooltip label="Editar">
                            <Button
                                variant="secondary"
                                size="icon"
                                aria-label="Editar"
                                onClick={() => openEdit(event)}
                            >
                                <Pencil className="size-4" />
                            </Button>
                        </IconTooltip>
                        <IconTooltip label="Eliminar">
                            <Button
                                variant="destructive"
                                size="icon"
                                aria-label="Eliminar"
                                onClick={() => setDeleting(event)}
                            >
                                <Trash2 className="size-4" />
                            </Button>
                        </IconTooltip>
                    </>
                )}
            />

            <EventEditDialog
                open={editOpen}
                onOpenChange={setEditOpen}
                event={editing}
                onSaved={() => void load()}
            />

            <AttendeesDialog
                open={attendeesOpen}
                onOpenChange={setAttendeesOpen}
                event={viewingAttendees}
            />

            {deleting && (
                <ConfirmDeleteDialog
                    open={deleting !== null}
                    onOpenChange={(open) => !open && setDeleting(null)}
                    title="Eliminar evento"
                    description={`¿Eliminar «${deleting.title}»? Esta acción no se puede deshacer.`}
                    confirmLabel="Eliminar"
                    deletingLabel="Eliminando…"
                    errorFallback="No se pudo eliminar el evento"
                    onConfirm={() => deleteEventById(deleting.id)}
                    onDeleted={() => {
                        setEvents((prev) =>
                            prev.filter((e) => e.id !== deleting.id),
                        );
                        setDeleting(null);
                    }}
                />
            )}
        </section>
    );
};
