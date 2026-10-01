import { useEffect, useRef, useState } from 'react';
import { CircleAlert, CircleCheck, CircleDashed } from 'lucide-react';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ApiError } from '@/lib/api';
import {
    getSendJobStatus,
    isStaleDraftMessage,
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
    reportDraftId?: string;
    onDraftRejected?: () => void;
    status: SendJobStatus | null;
    setStatus: (status: SendJobStatus | null) => void;
    onClose: () => void;
}

const SendEmailBody = ({
    slot,
    slotLabel,
    eventId,
    recipients,
    reportDraftId,
    onDraftRejected,
    status,
    setStatus,
    onClose,
}: SendEmailBodyProps) => {
    const recipientRegistrationIds = recipients.map((r) => r.id);
    const recipientById = new Map(recipients.map((r) => [r.id, r]));
    const [error, setError] = useState<string | null>(null);
    const [sending, setSending] = useState(false);
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

    const handleSend = async () => {
        setError(null);
        setSending(true);

        try {
            const jobId = await startBulkSend({
                slot,
                eventId,
                recipientRegistrationIds,
                reportDraftId,
            });

            poll(jobId);
        } catch (err) {
            setSending(false);

            // El acta caducó o cambiaron los destinatarios: hay que generarla de nuevo.
            if (err instanceof ApiError && isStaleDraftMessage(err.message)) {
                onDraftRejected?.();
            }

            setError(
                err instanceof ApiError
                    ? err.message
                    : 'No se pudo iniciar el envío',
            );
        }
    };

    const finished = status?.done ?? false;
    const results = status?.results ?? [];
    const processedIds = new Set(results.map((r) => r.registrationId));
    const pending = recipients.filter((r) => !processedIds.has(r.id));
    const succeeded = results.filter((r) => r.ok);
    const failed = results.filter((r) => !r.ok);

    return (
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Enviar {slotLabel.toLowerCase()}</DialogTitle>
                <DialogDescription>
                    {recipients.length}{' '}
                    {recipients.length === 1
                        ? 'destinatario seleccionado'
                        : 'destinatarios seleccionados'}
                    .
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

            {status && (
                <div className="grid gap-3">
                    <p
                        role="status"
                        className="rounded-lg bg-muted px-3 py-2 text-sm"
                    >
                        {finished
                            ? 'Envío terminado.'
                            : `Enviando… ${status.sent + status.failed} de ${status.total}`}
                    </p>

                    {!finished && (
                        <div className="max-h-48 overflow-y-auto rounded-lg bg-muted/50 p-2 text-sm">
                            <ul className="grid gap-1">
                                {results.map((r) => {
                                    const recipient = recipientById.get(
                                        r.registrationId,
                                    );

                                    return (
                                        <li
                                            key={r.registrationId}
                                            className="flex items-center gap-1.5"
                                        >
                                            {r.ok ? (
                                                <CircleCheck className="size-3.5 shrink-0 text-emerald-600" />
                                            ) : (
                                                <CircleAlert className="size-3.5 shrink-0 text-destructive" />
                                            )}
                                            <span>
                                                {recipient
                                                    ? personLabel(recipient)
                                                    : 'Destinatario'}
                                            </span>
                                        </li>
                                    );
                                })}
                                {pending.map((r) => (
                                    <li
                                        key={r.id}
                                        className="flex items-center gap-1.5 text-muted-foreground"
                                    >
                                        <CircleDashed className="size-3.5 shrink-0" />
                                        <span>{personLabel(r)}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {finished && (
                        <div className="grid gap-3">
                            <Alert
                                variant={
                                    failed.length > 0
                                        ? 'destructive'
                                        : 'success'
                                }
                            >
                                {failed.length > 0 ? (
                                    <CircleAlert />
                                ) : (
                                    <CircleCheck />
                                )}
                                <AlertTitle>
                                    {succeeded.length} enviados
                                    {failed.length > 0 &&
                                        `, ${failed.length} fallidos`}
                                </AlertTitle>
                            </Alert>

                            {succeeded.length > 0 && (
                                <div className="grid gap-1">
                                    <p className="text-xs font-medium text-muted-foreground">
                                        Enviados correctamente
                                    </p>
                                    <ul className="grid max-h-28 gap-1 overflow-y-auto rounded-lg bg-muted/50 p-2 text-sm">
                                        {succeeded.map((r) => {
                                            const recipient = recipientById.get(
                                                r.registrationId,
                                            );

                                            return (
                                                <li key={r.registrationId}>
                                                    {recipient
                                                        ? personLabel(recipient)
                                                        : 'Destinatario'}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            )}

                            {failed.length > 0 && (
                                <div className="grid gap-1">
                                    <p className="text-xs font-medium text-destructive">
                                        Fallidos
                                    </p>
                                    <ul className="grid max-h-28 gap-1 overflow-y-auto rounded-lg bg-destructive/10 p-2 text-sm">
                                        {failed.map((r) => {
                                            const recipient = recipientById.get(
                                                r.registrationId,
                                            );

                                            return (
                                                <li key={r.registrationId}>
                                                    {recipient
                                                        ? personLabel(recipient)
                                                        : 'Destinatario'}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {error && (
                <Alert variant="destructive">
                    <CircleAlert />
                    <AlertTitle>{error}</AlertTitle>
                </Alert>
            )}

            <DialogFooter>
                {!status ? (
                    <Button
                        type="button"
                        disabled={sending}
                        onClick={() => void handleSend()}
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
    // Se llama cuando el envío ya había terminado y el diálogo se cierra:
    // así el que lo abrió puede cerrarse también sin pasos extra.
    onFinishedClose: () => void;
    slot: SlotId;
    slotLabel: string;
    eventId: string;
    recipients: Attendee[];
    // Acta generada y revisada (solo para el parte de firmas).
    reportDraftId?: string;
    onDraftRejected?: () => void;
}

export const SendEmailDialog = ({
    open,
    onOpenChange,
    onFinishedClose,
    slot,
    slotLabel,
    eventId,
    recipients,
    reportDraftId,
    onDraftRejected,
}: SendEmailDialogProps) => {
    const [status, setStatus] = useState<SendJobStatus | null>(null);

    const handleOpenChange = (next: boolean) => {
        onOpenChange(next);

        if (!next && status?.done) {
            onFinishedClose();
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <SendEmailBody
                key={slot}
                slot={slot}
                slotLabel={slotLabel}
                eventId={eventId}
                recipients={recipients}
                reportDraftId={reportDraftId}
                onDraftRejected={onDraftRejected}
                status={status}
                setStatus={setStatus}
                onClose={() => handleOpenChange(false)}
            />
        </Dialog>
    );
};
