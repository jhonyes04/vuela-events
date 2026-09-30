import { useEffect, useRef, useState, type FormEvent } from 'react';
import { CircleAlert, CircleCheck } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
    getSendJobStatus,
    startBulkSend,
    type SendJobStatus,
} from '@/features/emailSettings/lib/emailSends';
import type { SlotId } from '@/features/emailSettings/lib/emailSettings';
import { personLabel, type Attendee } from '@/features/events/lib/events';

const POLL_MS = 2000;

interface SendEmailBodyProps {
    slot: SlotId;
    slotLabel: string;
    eventId: string;
    recipients: Attendee[];
    onClose: () => void;
}

const SendEmailBody = ({
    slot,
    slotLabel,
    eventId,
    recipients,
    onClose,
}: SendEmailBodyProps) => {
    const recipientUserIds = recipients.map((r) => r.id);
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [sending, setSending] = useState(false);
    const [status, setStatus] = useState<SendJobStatus | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, []);

    const poll = (jobId: string) => {
        pollRef.current = setInterval(() => {
            void getSendJobStatus(jobId).then((job) => {
                setStatus(job);

                if (job.done && pollRef.current) {
                    clearInterval(pollRef.current);
                }
            });
        }, POLL_MS);
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setSending(true);

        try {
            const jobId = await startBulkSend({
                slot,
                eventId,
                recipientUserIds,
                smtpPassword: password,
            });

            // La contraseña ya no hace falta: se limpia de inmediato.
            setPassword('');
            poll(jobId);
        } catch (err) {
            setSending(false);
            setError(
                err instanceof ApiError
                    ? err.message
                    : 'No se pudo iniciar el envío',
            );
        }
    };

    const finished = status?.done ?? false;

    return (
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Enviar {slotLabel.toLowerCase()}</DialogTitle>
                <DialogDescription>
                    {recipients.length}{' '}
                    {recipients.length === 1
                        ? 'destinatario seleccionado'
                        : 'destinatarios seleccionados'}
                    . La contraseña no se guarda, solo se usa para este envío.
                </DialogDescription>
            </DialogHeader>

            {!status && (
                <div className="max-h-32 overflow-y-auto rounded-lg bg-muted/50 p-2 text-sm">
                    <ul className="grid gap-1">
                        {recipients.map((r) => (
                            <li key={r.id}>{personLabel(r)}</li>
                        ))}
                    </ul>
                </div>
            )}

            {!status ? (
                <form
                    id="send-email-form"
                    onSubmit={(e) => void handleSubmit(e)}
                    className="grid gap-4"
                >
                    <div className="grid gap-1.5">
                        <Label htmlFor="send-email-password">
                            Tu contraseña de correo *
                        </Label>
                        <Input
                            id="send-email-password"
                            type="password"
                            required
                            autoComplete="off"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    {error && (
                        <Alert variant="destructive">
                            <CircleAlert />
                            <AlertTitle>No se pudo enviar</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                </form>
            ) : (
                <div className="grid gap-3">
                    <p
                        role="status"
                        className="rounded-lg bg-muted px-3 py-2 text-sm"
                    >
                        {finished
                            ? 'Envío terminado.'
                            : `Enviando… ${status.sent + status.failed} de ${status.total}`}
                    </p>

                    {finished && (
                        <Alert
                            variant={
                                status.failed > 0 ? 'destructive' : 'success'
                            }
                        >
                            {status.failed > 0 ? (
                                <CircleAlert />
                            ) : (
                                <CircleCheck />
                            )}
                            <AlertTitle>
                                {status.sent} enviados
                                {status.failed > 0 &&
                                    `, ${status.failed} fallidos`}
                            </AlertTitle>
                            {status.failed > 0 && (
                                <AlertDescription>
                                    {status.results
                                        .filter((r) => !r.ok)
                                        .map((r) => r.email)
                                        .join(', ')}
                                </AlertDescription>
                            )}
                        </Alert>
                    )}
                </div>
            )}

            <DialogFooter>
                {!status ? (
                    <Button
                        type="submit"
                        form="send-email-form"
                        disabled={sending}
                    >
                        {sending ? 'Enviando…' : 'Enviar'}
                    </Button>
                ) : (
                    <Button disabled={!finished} onClick={onClose}>
                        Cerrar
                    </Button>
                )}
            </DialogFooter>
        </DialogContent>
    );
};

interface SendEmailDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    slot: SlotId;
    slotLabel: string;
    eventId: string;
    recipients: Attendee[];
}

export const SendEmailDialog = ({
    open,
    onOpenChange,
    slot,
    slotLabel,
    eventId,
    recipients,
}: SendEmailDialogProps) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <SendEmailBody
            key={slot}
            slot={slot}
            slotLabel={slotLabel}
            eventId={eventId}
            recipients={recipients}
            onClose={() => onOpenChange(false)}
        />
    </Dialog>
);
