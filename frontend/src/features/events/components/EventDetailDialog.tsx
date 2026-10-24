import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/hooks/context';
import { canManageResource } from '@/lib/ownership';
import { ROLE_IDS } from '@/features/users/lib/roles';
import { DeleteEventDialog } from '@/features/events/components/DeleteEventDialog';
import { DeleteEventSeriesDialog } from '@/features/events/components/DeleteEventSeriesDialog';
import { EventInfoRows } from '@/features/events/components/EventInfoRows';
import { EventMaterialsSection } from '@/features/events/components/EventMaterialsSection';
import { EventAttachmentsSection } from '@/features/events/components/EventAttachmentsSection';
import { EventAttendeesSection } from '@/features/events/components/EventAttendeesSection';
import { EventDetailFooter } from '@/features/events/components/EventDetailFooter';
import { AddParticipantsDialog } from '@/features/events/components/AddParticipantsDialog';
import { ParticipantsCountDialog } from '@/features/events/components/ParticipantsCountDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { IconTooltip } from '@/components/IconTooltip';
import { useAttendees } from '@/features/events/hooks/useAttendees';
import { ProjectInfoDialog } from '@/features/projects/components/ProjectInfoDialog';
import {
    getProjectColorBorder,
    getProjectColorTint,
} from '@/features/projects/lib/colors';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
    adminUnregisterAttendee,
    hasEnded,
    isFull,
    registerForEventById,
    unregisterFromEventById,
    type Attendee,
    type EventItem,
} from '@/features/events/lib/events';
import { Alert, AlertTitle } from '@/components/ui/alert';
import {
    AlertCircle,
    ClipboardList,
    EyeIcon,
    SquareDashedText,
} from 'lucide-react';

interface EventDetailBodyProps {
    event: EventItem;
    onClose: () => void;
    onChanged: () => void;
    onDeleted: () => void;
}

// Contenido con su propio estado: se recrea al cambiar de evento (key).
const EventDetailBody = ({
    event,
    onClose,
    onChanged,
    onDeleted,
}: EventDetailBodyProps) => {
    const { user } = useAuth();
    const [busy, setBusy] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [seriesConfirmOpen, setSeriesConfirmOpen] = useState(false);
    const [participantsOpen, setParticipantsOpen] = useState(false);
    const [addOpen, setAddOpen] = useState(false);
    const [deletingAttendee, setDeletingAttendee] = useState<Attendee | null>(
        null,
    );
    const [refreshNonce, setRefreshNonce] = useState(0);
    const [projectDescOpen, setProjectDescOpen] = useState(false);
    // Se refresca cuando cambia el número de inscritos, la inscripción propia,
    // o tras agregar/quitar a alguien manualmente.
    const { attendees, failed, loading } = useAttendees(
        event.id,
        `${event._count.registrations}|${event.registered}|${refreshNonce}`,
    );

    const ended = hasEnded(event);
    const full = isFull(event);
    const isDt = user?.roleId === ROLE_IDS.DT;
    const isAdmin = user?.roleId === ROLE_IDS.ADMIN;
    // Un DT puede inscribirse aunque esté completo: no ocupa plaza.
    const blockedByCapacity = full && !isDt && !event.registered;
    const colorStyle = ended
        ? {
              border: { className: 'border-t-gray-400' },
              tint: { className: 'bg-gray-400/10' },
          }
        : full
          ? {
                border: { className: 'border-t-red-500' },
                tint: { className: 'bg-red-500/10' },
            }
          : {
                border: getProjectColorBorder(event.project.color),
                tint: getProjectColorTint(event.project.color),
            };

    // Al abrir la ficha de un evento completo, se avisa aunque el usuario
    // ya esté inscrito. El ref evita el doble aviso del StrictMode en dev.
    const notifiedFullRef = useRef(false);

    useEffect(() => {
        if ((full || ended) && !notifiedFullRef.current) {
            notifiedFullRef.current = true;
            toast.error(
                ended
                    ? 'Este evento ha finalizado.'
                    : 'Este evento está completo.',
            );
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const hasAttendedParticipants = ended && !!event.participantsCount;
    // Solo oculta el botón: el servidor comprueba de nuevo quién puede eliminar.
    const canDelete =
        canManageResource(
            user,
            event.createdBy.id,
            'events:delete',
            'events:delete:own',
        ) && !hasAttendedParticipants;

    // "Agregar" exige poder ver candidatos y poder inscribirlos (la misma
    // llamada que carga el diálogo requiere attendees:view).
    const canAddAttendees =
        (user?.permissions.includes('attendees:view') ?? false) &&
        (user?.permissions.includes('attendees:add') ?? false);
    const canDeleteAttendees =
        user?.permissions.includes('attendees:delete') ?? false;

    const run = async (action: () => Promise<void>, success: string) => {
        setBusy(true);

        try {
            await action();

            toast.success(success);
            onChanged();
        } catch (e) {
            toast.error(
                e instanceof ApiError
                    ? e.message
                    : 'No se pudo completar la acción',
            );
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <Dialog
                open
                onOpenChange={(open) => {
                    if (!open) onClose();
                }}
            >
                <DialogContent
                    className={cn(
                        'border-t-4 sm:max-w-2xl',
                        colorStyle.border.className,
                    )}
                    style={colorStyle.border.style}
                >
                    <DialogHeader
                        className={cn(
                            '-mx-4 -mt-4 rounded-t-xl px-4 pt-4 pb-3',
                            colorStyle.tint.className,
                        )}
                        style={colorStyle.tint.style}
                    >
                        <DialogTitle>{event.title}</DialogTitle>
                        <DialogDescription
                            render={
                                <div className="flex items-center justify-between" />
                            }
                        >
                            {event.subtitle ?? 'Detalle de la sesión'}
                            <div className="flex flex-wrap gap-1.5">
                                {event.registered && (
                                    <Badge className="bg-brand-green text-white">
                                        Inscrito
                                    </Badge>
                                )}
                                {full && !ended && (
                                    <Badge variant="destructive">
                                        Completo
                                    </Badge>
                                )}
                                {ended && (
                                    <Badge variant="outline">Finalizado</Badge>
                                )}
                            </div>
                        </DialogDescription>
                    </DialogHeader>

                    <EventInfoRows
                        event={event}
                        projectTrailing={
                            <IconTooltip label="Ver información del proyecto">
                                <Button
                                    type="button"
                                    size="icon-xs"
                                    className="bg-green-800"
                                    aria-label="Ver proyecto"
                                    onClick={() => setProjectDescOpen(true)}
                                >
                                    <EyeIcon className="size-3.5" />
                                </Button>
                            </IconTooltip>
                        }
                    />

                    {event.description && (
                        <fieldset className="rounded-xl border p-3 text-sm text-muted-foreground">
                            <legend className="flex items-center gap-1.5 whitespace-nowrap px-1 font-bold">
                                <SquareDashedText className="size-4 shrink-0 text-brand-green" />
                                Descripción
                            </legend>

                            <p className="text-sm whitespace-pre-line">
                                {event.description}
                            </p>
                        </fieldset>
                    )}

                    <EventMaterialsSection materials={event.materials} />

                    <EventAttachmentsSection
                        eventId={event.id}
                        attachments={event.attachments}
                    />

                    <EventAttendeesSection
                        event={event}
                        attendees={attendees}
                        failed={failed}
                        loading={loading}
                        canAddAttendees={canAddAttendees}
                        canDeleteAttendees={canDeleteAttendees}
                        onAddClick={() => setAddOpen(true)}
                        onDeleteAttendee={setDeletingAttendee}
                    />

                    {ended && (
                        <fieldset className="rounded-xl border p-3 text-sm text-muted-foreground">
                            <legend className="flex items-center gap-1.5 whitespace-nowrap px-1 font-bold">
                                <ClipboardList className="size-4 shrink-0 text-brand-green" />
                                Usuarios atendidos
                            </legend>
                            <p className="justify-self-end">
                                <strong className="text-foreground">
                                    {event.participantsCount ?? 'sin indicar'}
                                </strong>
                                {event.participantsObservations && (
                                    <>
                                        {' — '}
                                        {event.participantsObservations}
                                    </>
                                )}
                            </p>
                        </fieldset>
                    )}
                    {ended && (
                        <Alert variant="destructive" className="bg-red-100">
                            <AlertCircle />
                            <AlertTitle>Evento finalizado</AlertTitle>
                        </Alert>
                    )}
                    <EventDetailFooter
                        event={event}
                        busy={busy}
                        ended={ended}
                        isAdmin={isAdmin}
                        canDelete={canDelete}
                        blockedByCapacity={blockedByCapacity}
                        onDeleteClick={() => setConfirmOpen(true)}
                        onDeleteSeriesClick={() => setSeriesConfirmOpen(true)}
                        onParticipantsClick={() => setParticipantsOpen(true)}
                        onRegisterClick={() => {
                            if (ended) {
                                toast.error('Este evento ha finalizado.');
                                return;
                            }

                            if (blockedByCapacity) {
                                toast.error('Este evento está completo.');
                                return;
                            }

                            void run(
                                () => registerForEventById(event.id),
                                'Te has inscrito correctamente.',
                            );
                        }}
                        onUnregisterClick={() =>
                            void run(
                                () => unregisterFromEventById(event.id),
                                'Has cancelado tu inscripción.',
                            )
                        }
                    />
                </DialogContent>
            </Dialog>

            <ProjectInfoDialog
                open={projectDescOpen}
                onOpenChange={setProjectDescOpen}
                project={event.project}
            />

            {canDelete && (
                <DeleteEventDialog
                    event={event}
                    open={confirmOpen}
                    onOpenChange={setConfirmOpen}
                    onDeleted={onDeleted}
                />
            )}

            {canDelete && event.seriesId && (
                <DeleteEventSeriesDialog
                    event={event}
                    open={seriesConfirmOpen}
                    onOpenChange={setSeriesConfirmOpen}
                    onDeleted={() => onDeleted()}
                />
            )}
            <ParticipantsCountDialog
                open={participantsOpen}
                onOpenChange={setParticipantsOpen}
                event={event}
                onSaved={onChanged}
            />

            {canAddAttendees && (
                <AddParticipantsDialog
                    open={addOpen}
                    onOpenChange={setAddOpen}
                    eventId={event.id}
                    onAdded={() => {
                        setRefreshNonce((n) => n + 1);
                        onChanged();
                    }}
                />
            )}

            {deletingAttendee && (
                <ConfirmDeleteDialog
                    open={deletingAttendee !== null}
                    onOpenChange={(open) => !open && setDeletingAttendee(null)}
                    title="Quitar del evento"
                    description={`¿Quitar a «${deletingAttendee.puntoVuela} (${deletingAttendee.name})» de este evento? Esta acción no se puede deshacer.`}
                    confirmLabel="Quitar"
                    deletingLabel="Quitando…"
                    errorFallback="No se pudo quitar al participante"
                    successLabel="Participante quitado."
                    onConfirm={() =>
                        adminUnregisterAttendee(event.id, deletingAttendee.id)
                    }
                    onDeleted={() => {
                        setRefreshNonce((n) => n + 1);
                        setDeletingAttendee(null);
                        onChanged();
                    }}
                />
            )}
        </>
    );
};

interface EventDetailDialogProps {
    event: EventItem | null;
    onClose: () => void;
    onChanged: () => void;
    onDeleted: () => void;
}

export const EventDetailDialog = ({
    event,
    onClose,
    onChanged,
    onDeleted,
}: EventDetailDialogProps) => {
    if (!event) return null;

    return (
        <EventDetailBody
            key={event.id}
            event={event}
            onClose={onClose}
            onChanged={onChanged}
            onDeleted={onDeleted}
        />
    );
};
