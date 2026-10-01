import { useState } from 'react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { AttendeeChips } from '@/features/events/components/AttendeeChips';
import { SendEmailDialog } from '@/features/emailSettings/components/SendEmailDialog';
import { ReportPreviewDialog } from '@/features/events/components/ReportPreviewDialog';
import { useAttendees } from '@/features/events/hooks/useAttendees';
import { useReportDraft } from '@/features/events/hooks/useReportDraft';
import { scrollbarOptions } from '@/lib/overlayScrollbarsOptions';
import type { EventItem } from '@/features/events/lib/events';
import type { SlotId } from '@/features/emailSettings/lib/emailSettings';

interface AttendeesBodyProps {
    event: EventItem;
    onCloseAll: () => void;
}

const AttendeesBody = ({ event, onCloseAll }: AttendeesBodyProps) => {
    const { attendees, failed, loading } = useAttendees(
        event.id,
        `${event._count.registrations}`,
    );

    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [sendSlot, setSendSlot] = useState<SlotId | null>(null);
    const [previewOpen, setPreviewOpen] = useState(false);
    const { draft, generating, error, generate, clear } = useReportDraft(
        event.id,
    );

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
                    />
                </OverlayScrollbarsComponent>
            )}

            {error && (
                <p role="alert" className="text-sm text-destructive">
                    {error}
                </p>
            )}

            <DialogFooter>
                <Button
                    variant="outline"
                    disabled={selected.size === 0}
                    onClick={() => setSendSlot('convocatoria')}
                >
                    Enviar convocatoria
                </Button>
                {draft && (
                    <Button
                        variant="outline"
                        onClick={() => setPreviewOpen(true)}
                    >
                        Ver parte
                    </Button>
                )}
                <Button
                    variant="outline"
                    disabled={selected.size === 0 || generating}
                    onClick={() => void handleReportClick()}
                >
                    {generating
                        ? 'Generando…'
                        : draft
                          ? 'Enviar parte de firmas'
                          : 'Generar parte de firmas'}
                </Button>
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
