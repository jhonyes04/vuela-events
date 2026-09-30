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
import { useAttendees } from '@/features/events/hooks/useAttendees';
import { scrollbarOptions } from '@/lib/overlayScrollbarsOptions';
import type { EventItem } from '@/features/events/lib/events';

interface AttendeesBodyProps {
    event: EventItem;
}

const AttendeesBody = ({ event }: AttendeesBodyProps) => {
    const { attendees, failed, loading } = useAttendees(
        event.id,
        `${event._count.registrations}`,
    );
    // Selección para futuras acciones en lote sobre inscritos.
    const [selected, setSelected] = useState<Set<string>>(new Set());

    const toggle = (id: string) =>
        setSelected((prev) => {
            const next = new Set(prev);

            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }

            return next;
        });

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

            <DialogFooter>
                <Button variant="outline">Enviar convocatoria</Button>
                <Button variant="outline">Enviar parte de firmas</Button>
            </DialogFooter>
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
            <AttendeesBody key={event.id} event={event} />
        </Dialog>
    );
};
