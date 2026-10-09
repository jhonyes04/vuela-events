import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import { useAuth } from '@/features/auth/hooks/context';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { IconTooltip } from '@/components/IconTooltip';
import { AttendeeChips } from '@/features/events/components/AttendeeChips';
import { AddParticipantsDialog } from '@/features/events/components/AddParticipantsDialog';
import { SendEmailDialog } from '@/features/emailSettings/components/SendEmailDialog';
import { ReportPreviewDialog } from '@/features/events/components/ReportPreviewDialog';
import { useAttendees } from '@/features/events/hooks/useAttendees';
import { useReportDraft } from '@/features/events/hooks/useReportDraft';
import { scrollbarOptions } from '@/lib/overlayScrollbarsOptions';
import {
    adminUnregisterAttendee,
    hasEnded,
    type Attendee,
    type EventItem,
} from '@/features/events/lib/events';
import type { SlotId } from '@/features/emailSettings/lib/emailSettings';

interface AttendeesBodyProps {
    event: EventItem;
    onCloseAll: () => void;
}

const AttendeesBody = ({ event, onCloseAll }: AttendeesBodyProps) => {
    const { user } = useAuth();
    const ended = hasEnded(event);
    // "Agregar" exige poder ver candidatos y poder inscribirlos (la misma
    // llamada que carga el diálogo requiere attendees:view).
    const canAddAttendees =
        (user?.permissions.includes('attendees:view') ?? false) &&
        (user?.permissions.includes('attendees:add') ?? false);
    const canDeleteAttendees =
        user?.permissions.includes('attendees:delete') ?? false;
    const [refreshNonce, setRefreshNonce] = useState(0);
    const { attendees, failed, loading } = useAttendees(
        event.id,
        `${event._count.registrations}|${refreshNonce}`,
    );

    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [sendSlot, setSendSlot] = useState<SlotId | null>(null);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [addOpen, setAddOpen] = useState(false);
    const [deletingAttendee, setDeletingAttendee] = useState<Attendee | null>(
        null,
    );
    const { draft, generating, generate, clear } = useReportDraft(event.id);

    // Cambiar la selección invalida el parte generado: hay que volver a generarlo.
    const toggle = (id: string) => {
        clear();
        setPreviewOpen(false);
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

    // Primero se genera y se visualiza; con el parte generado, el mismo botón envía.
    const handleReportClick = async () => {
        if (draft) {
            setSendSlot('parte_firmas');
            return;
        }

        if (await generate([...selected])) setPreviewOpen(true);
    };

    return (
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Inscritos en «{event.title}»</DialogTitle>
                <DialogDescription>
                    {event._count.registrations}{' '}
                    {event._count.registrations === 1
                        ? 'inscrito'
                        : 'inscritos'}
                </DialogDescription>
            </DialogHeader>
            {canAddAttendees && (
                <div className="ms-auto">
                    <IconTooltip label="Agregar participantes">
                        <Button
                            variant="secondary"
                            size="icon"
                            aria-label="Agregar participantes"
                            onClick={() => setAddOpen(true)}
                        >
                            <UserPlus className="size-4" />
                        </Button>
                    </IconTooltip>
                </div>
            )}

            {loading ? (
                <p role="status" className="text-sm text-muted-foreground">
                    Cargando inscritos…
                </p>
            ) : failed ? (
                <p className="text-sm text-destructive">
                    No se pudo cargar la lista de inscritos.
                </p>
            ) : attendees.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    Todavía no hay inscritos.
                </p>
            ) : (
                <OverlayScrollbarsComponent
                    className="max-h-80 rounded-lg bg-muted/50"
                    options={scrollbarOptions}
                    defer
                >
                    <AttendeeChips
                        attendees={attendees}
                        selected={selected}
                        onToggle={toggle}
                        onDelete={
                            canDeleteAttendees ? setDeletingAttendee : undefined
                        }
                    />
                </OverlayScrollbarsComponent>
            )}

            <DialogFooter>
                <div className="grid w-full gap-2">
                    <div className="flex flex-1 flex-wrap justify-end gap-2">
                        <Button
                            variant="default"
                            disabled={selected.size === 0}
                            onClick={() => setSendSlot('convocatoria')}
                        >
                            Enviar convocatoria
                        </Button>
                        {draft && (
                            <Button
                                variant="default"
                                onClick={() => setPreviewOpen(true)}
                            >
                                Ver parte
                            </Button>
                        )}
                        <Button
                            variant="default"
                            disabled={
                                selected.size === 0 || generating || !ended
                            }
                            onClick={() => void handleReportClick()}
                        >
                            {generating
                                ? 'Generando…'
                                : draft
                                  ? 'Enviar parte de firmas'
                                  : 'Generar parte de firmas'}
                        </Button>
                    </div>

                    {!ended && (
                        <p className="text-xs text-destructive sm:text-right">
                            El parte de firmas solo se puede generar una vez
                            finalizado el evento.
                        </p>
                    )}
                </div>
            </DialogFooter>

            {draft && (
                <ReportPreviewDialog
                    open={previewOpen}
                    onOpenChange={setPreviewOpen}
                    url={draft.url}
                    filename={draft.filename}
                />
            )}

            {sendSlot && (
                <SendEmailDialog
                    open={sendSlot !== null}
                    onOpenChange={(open) => !open && setSendSlot(null)}
                    onFinishedClose={() => {
                        setSendSlot(null);
                        onCloseAll();
                    }}
                    slot={sendSlot}
                    slotLabel={
                        sendSlot === 'convocatoria'
                            ? 'convocatoria'
                            : 'parte de firmas'
                    }
                    eventId={event.id}
                    recipients={attendees.filter((a) => selected.has(a.id))}
                    reportDraftId={
                        sendSlot === 'parte_firmas' ? draft?.id : undefined
                    }
                    onDraftRejected={clear}
                />
            )}

            {canAddAttendees && (
                <AddParticipantsDialog
                    open={addOpen}
                    onOpenChange={setAddOpen}
                    eventId={event.id}
                    onAdded={() => setRefreshNonce((n) => n + 1)}
                />
            )}

            {deletingAttendee && (
                <ConfirmDeleteDialog
                    open={deletingAttendee !== null}
                    onOpenChange={(open) => !open && setDeletingAttendee(null)}
                    title="Quitar del evento"
                    description={`¿Quitar a «${deletingAttendee.name}» de este evento? Esta acción no se puede deshacer.`}
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
                    }}
                />
            )}
        </DialogContent>
    );
};

interface AttendeesDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    // null = nada que mostrar (el diálogo no se muestra).
    event: EventItem | null;
}

export const AttendeesDialog = ({
    open,
    onOpenChange,
    event,
}: AttendeesDialogProps) => {
    if (!event) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <AttendeesBody
                key={event.id}
                event={event}
                onCloseAll={() => onOpenChange(false)}
            />
        </Dialog>
    );
};
