import { useEffect, useState } from 'react';
import {
    CalendarRange,
    ClipboardList,
    Pencil,
    Trash2,
    Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IconTooltip } from '@/components/IconTooltip';
import { AttendeesDialog } from '@/features/events/components/AttendeesDialog';
import { EventEditDialog } from '@/features/events/components/CreateEventDialog';
import { EventsTable } from '@/features/events/components/EventsTable';
import { ParticipantsCountDialog } from '@/features/events/components/ParticipantsCountDialog';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/features/auth/hooks/context';
import { canManageResource } from '@/lib/ownership';
import {
    deleteEventById,
    hasEnded,
    hasStarted,
    listAllEvents,
    type EventItem,
} from '@/features/events/lib/events';
import { PageTitle } from '@/components/PageTitle';

interface Pending {
    ids: string[];
    label: string;
}

export const EventsManagementPage = () => {
    const { user } = useAuth();
    const [events, setEvents] = useState<EventItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editOpen, setEditOpen] = useState(false);
    const [editing, setEditing] = useState<EventItem | null>(null);
    const [deleting, setDeleting] = useState<Pending | null>(null);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [attendeesOpen, setAttendeesOpen] = useState(false);
    const [viewingAttendees, setViewingAttendees] = useState<EventItem | null>(
        null,
    );
    const [participantsOpen, setParticipantsOpen] = useState(false);
    const [editingParticipants, setEditingParticipants] =
        useState<EventItem | null>(null);

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

    const openParticipants = (event: EventItem) => {
        setEditingParticipants(event);
        setParticipantsOpen(true);
    };

    const canEditEvent = (event: EventItem) =>
        canManageResource(
            user,
            event.createdBy.id,
            'events:edit',
            'events:edit:own',
        );

    const canDeleteEvent = (event: EventItem) =>
        canManageResource(
            user,
            event.createdBy.id,
            'events:delete',
            'events:delete:own',
        );

    const hasFullEventAccess =
        (user?.permissions.includes('events:edit') ?? false) ||
        (user?.permissions.includes('events:delete') ?? false);

    const visibleEvents = hasFullEventAccess
        ? events
        : events.filter((event) => event.createdBy.id === user?.id);

    // Un evento pasado o en curso no se puede eliminar.
    const isSelectable = (event: EventItem) =>
        !hasStarted(event) && canDeleteEvent(event);

    const toggleOne = (id: string) => {
        setSelected((prev) => {
            const next = new Set(prev);

            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }

            return next;
        });
    };

    const toggleAll = (ids: string[], allSelected: boolean) => {
        setSelected((prev) => {
            const next = new Set(prev);

            if (allSelected) {
                ids.forEach((id) => next.delete(id));
            } else {
                ids.forEach((id) => next.add(id));
            }

            return next;
        });
    };

    return (
        <section>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                <PageTitle icon={CalendarRange} className="mb-0">
                    Gestionar Eventos
                </PageTitle>
                {selected.size > 0 && (
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={() =>
                            setDeleting({
                                ids: [...selected],
                                label:
                                    selected.size === 1
                                        ? 'este evento'
                                        : `estos ${selected.size} eventos`,
                            })
                        }
                    >
                        Eliminar seleccionados ({selected.size})
                    </Button>
                )}
            </div>

            <EventsTable
                events={visibleEvents}
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
                showParticipants
                selection={{
                    selected,
                    isSelectable,
                    onToggleOne: toggleOne,
                    onToggleAll: toggleAll,
                }}
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
                        <IconTooltip
                            label={
                                hasEnded(event)
                                    ? 'Usuarios atendidos'
                                    : 'Disponible al finalizar el evento'
                            }
                        >
                            <Button
                                variant="default"
                                className="bg-green-800"
                                size="icon"
                                aria-label="Usuarios atendidos"
                                disabled={!hasEnded(event)}
                                onClick={() => openParticipants(event)}
                            >
                                <ClipboardList className="size-4" />
                            </Button>
                        </IconTooltip>

                        {canEditEvent(event) && (
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
                        )}

                        {canDeleteEvent(event) && (
                            <IconTooltip
                                label={
                                    hasStarted(event)
                                        ? 'No se puede eliminar un evento ya empezado'
                                        : 'Eliminar'
                                }
                            >
                                <Button
                                    variant="destructive"
                                    size="icon"
                                    aria-label="Eliminar"
                                    disabled={hasStarted(event)}
                                    onClick={() =>
                                        setDeleting({
                                            ids: [event.id],
                                            label: `«${event.title}»`,
                                        })
                                    }
                                >
                                    <Trash2 className="size-4" />
                                </Button>
                            </IconTooltip>
                        )}
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

            <ParticipantsCountDialog
                open={participantsOpen}
                onOpenChange={setParticipantsOpen}
                event={editingParticipants}
                onSaved={() => void load()}
            />

            {deleting && (
                <ConfirmDeleteDialog
                    open={deleting !== null}
                    onOpenChange={(open) => !open && setDeleting(null)}
                    title="Eliminar eventos"
                    description={`¿Eliminar ${deleting.label}?`}
                    confirmLabel="Eliminar"
                    deletingLabel="Eliminando…"
                    errorFallback="No se pudo eliminar el evento"
                    successLabel={({ succeeded, failed }) =>
                        failed === 0
                            ? succeeded.length === 1
                                ? 'Evento eliminado.'
                                : `${succeeded.length} eventos eliminados.`
                            : `${succeeded.length} eliminado${succeeded.length === 1 ? '' : 's'}, ${failed} no se pudo eliminar.`
                    }
                    onConfirm={async () => {
                        const results = await Promise.allSettled(
                            deleting.ids.map((id) =>
                                deleteEventById(id).then(() => id),
                            ),
                        );
                        const succeeded = results
                            .filter(
                                (r): r is PromiseFulfilledResult<string> =>
                                    r.status === 'fulfilled',
                            )
                            .map((r) => r.value);
                        const failed = deleting.ids.length - succeeded.length;

                        if (succeeded.length === 0) {
                            throw new Error('No se pudo eliminar');
                        }

                        return { succeeded, failed };
                    }}
                    onDeleted={({ succeeded }) => {
                        const removed = new Set(succeeded);

                        setEvents((prev) =>
                            prev.filter((e) => !removed.has(e.id)),
                        );
                        setSelected((prev) => {
                            const next = new Set(prev);

                            succeeded.forEach((id) => next.delete(id));

                            return next;
                        });
                        setDeleting(null);
                    }}
                />
            )}
        </section>
    );
};
