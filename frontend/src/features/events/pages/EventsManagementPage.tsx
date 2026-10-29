import { useEffect, useState } from 'react';
import { toast } from 'sonner';
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
import {
    CreateEventDialog,
    EventEditDialog,
} from '@/features/events/components/CreateEventDialog';
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
    isEventFinishedUnattended,
    listAllEvents,
    type EventItem,
} from '@/features/events/lib/events';
import { PageTitle } from '@/components/PageTitle';

interface Pending {
    ids: string[];
    label: string;
    confirmText?: string;
}

export const EventsManagementPage = () => {
    const { user } = useAuth();
    const [events, setEvents] = useState<EventItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editOpen, setEditOpen] = useState(false);
    const [editing, setEditing] = useState<EventItem | null>(null);
    const [deleting, setDeleting] = useState<Pending | null>(null);
    const [motivo, setMotivo] = useState('');
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

    // Un evento en curso no se puede eliminar. Uno ya pasado sí, pero solo
    // si no tiene inscritos ni atendidos (nadie a quien avisar).
    const isDeletableNow = (event: EventItem) =>
        !hasStarted(event) || isEventFinishedUnattended(event);

    const isSelectable = (event: EventItem) =>
        isDeletableNow(event) && canDeleteEvent(event);

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
                <div className="flex items-center gap-2 ms-auto">
                    <CreateEventDialog
                        onCreated={({ count }) => {
                            toast.success(
                                count === 1
                                    ? 'Evento creado'
                                    : `Se han creado ${count} sesiones`,
                            );

                            void load();
                        }}
                    />
                </div>
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
                filtersTrailing={
                    selected.size > 0 && (
                        <Button
                            variant="destructive"
                            size="sm"
                            className="ms-auto"
                            onClick={() => {
                                setMotivo('');
                                setDeleting({
                                    ids: [...selected],
                                    label:
                                        selected.size === 1
                                            ? 'este evento'
                                            : `estos ${selected.size} eventos`,
                                    confirmText:
                                        'Eliminar eventos seleccionados',
                                });
                            }}
                        >
                            Eliminar seleccionados ({selected.size})
                        </Button>
                    )
                }
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
                                    isDeletableNow(event)
                                        ? 'Eliminar'
                                        : 'No se puede eliminar un evento en curso'
                                }
                            >
                                <Button
                                    variant="destructive"
                                    size="icon"
                                    aria-label="Eliminar"
                                    disabled={!isDeletableNow(event)}
                                    onClick={() => {
                                        setMotivo('');
                                        setDeleting({
                                            ids: [event.id],
                                            label: `«${event.title}»`,
                                            confirmText: event.title,
                                        });
                                    }}
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
                onChanged={() => void load()}
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
                    confirmText={deleting.confirmText}
                    confirmLabel="Eliminar"
                    deletingLabel="Eliminando…"
                    errorFallback="No se pudo eliminar el evento"
                    textField={{
                        label:
                            'Motivo (opcional, se incluye en el aviso a los inscritos)',
                        value: motivo,
                        onChange: setMotivo,
                        placeholder: 'Por qué se cancela...',
                    }}
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
                                deleteEventById(id, motivo || undefined).then(
                                    () => id,
                                ),
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
