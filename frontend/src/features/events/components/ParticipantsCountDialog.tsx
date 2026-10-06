import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/lib/api';
import {
    updateEventParticipantsCount,
    type EventItem,
} from '@/features/events/lib/events';

// Solo lo necesario para editar: así también se usa desde estadísticas.
export type ParticipantsEvent = Pick<
    EventItem,
    'id' | 'title' | 'participantsCount'
>;

interface ParticipantsCountBodyProps {
    event: ParticipantsEvent;
    onOpenChange: (open: boolean) => void;
    onSaved: () => void;
}

// Con su propio estado: se recrea (key) al cambiar de evento.
const ParticipantsCountBody = ({
    event,
    onOpenChange,
    onSaved,
}: ParticipantsCountBodyProps) => {
    const [value, setValue] = useState(
        event.participantsCount?.toString() ?? '',
    );
    const [submitting, setSubmitting] = useState(false);

    const handleSave = async () => {
        setSubmitting(true);

        try {
            await updateEventParticipantsCount(
                event.id,
                value === '' ? null : Number(value),
            );

            toast.success('Participantes guardados.');
            onSaved();
            onOpenChange(false);
        } catch (e) {
            toast.error(
                e instanceof ApiError ? e.message : 'No se pudo guardar',
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <DialogContent className="sm:max-w-sm">
            <DialogHeader>
                <DialogTitle>Usuarios atendidos</DialogTitle>
                <DialogDescription>
                    Gente externa atendida en «{event.title}» (no son inscritos
                    de la app).
                </DialogDescription>
            </DialogHeader>

            <div className="grid gap-1.5">
                <Label htmlFor="participants-count">Número de usuarios</Label>
                <Input
                    id="participants-count"
                    type="number"
                    min={0}
                    step={1}
                    autoFocus
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                />
            </div>

            <DialogFooter>
                <Button
                    type="button"
                    disabled={submitting}
                    onClick={() => void handleSave()}
                >
                    {submitting ? 'Guardando…' : 'Guardar'}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
};

interface ParticipantsCountDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    // null = nada que editar (el diálogo no se muestra).
    event: ParticipantsEvent | null;
    onSaved: () => void;
}

export const ParticipantsCountDialog = ({
    open,
    onOpenChange,
    event,
    onSaved,
}: ParticipantsCountDialogProps) => {
    if (!event) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <ParticipantsCountBody
                key={event.id}
                event={event}
                onOpenChange={onOpenChange}
                onSaved={onSaved}
            />
        </Dialog>
    );
};
