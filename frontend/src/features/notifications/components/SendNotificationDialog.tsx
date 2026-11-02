import { useState, type SubmitEvent } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { ApiError } from '@/lib/api';
import { sendBroadcastNotification } from '@/features/notifications/lib/notifications';

interface SendNotificationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const SendNotificationDialog = ({
    open,
    onOpenChange,
}: SendNotificationDialogProps) => {
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [sending, setSending] = useState(false);

    const reset = () => {
        setTitle('');
        setBody('');
    };

    const handleSubmit = async (e: SubmitEvent) => {
        e.preventDefault();

        if (!title.trim() || !body.trim()) {
            toast.error('Rellena el título y el mensaje.');
            return;
        }

        setSending(true);

        try {
            const count = await sendBroadcastNotification(title, body);

            toast.success(
                count === 1
                    ? 'Notificación enviada a 1 persona.'
                    : `Notificación enviada a ${count} personas.`,
            );
            reset();
            onOpenChange(false);
        } catch (err) {
            toast.error(
                err instanceof ApiError
                    ? err.message
                    : 'No se pudo enviar la notificación',
            );
        } finally {
            setSending(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Enviar notificación</DialogTitle>
                    <DialogDescription>
                        Llega a todos los usuarios activos menos admin.
                    </DialogDescription>
                </DialogHeader>

                <form
                    id="send-notification-form"
                    onSubmit={(e) => void handleSubmit(e)}
                    className="grid gap-4"
                >
                    <div className="grid gap-1.5">
                        <Label htmlFor="notification-title">Título *</Label>
                        <Input
                            id="notification-title"
                            value={title}
                            maxLength={120}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="notification-body">Mensaje *</Label>
                        <Textarea
                            id="notification-body"
                            value={body}
                            maxLength={1000}
                            rows={5}
                            onChange={(e) => setBody(e.target.value)}
                        />
                    </div>
                </form>

                <DialogFooter>
                    <Button
                        type="submit"
                        form="send-notification-form"
                        disabled={sending}
                    >
                        {sending ? 'Enviando…' : 'Enviar'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
