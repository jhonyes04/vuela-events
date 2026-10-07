import { useEffect, useMemo, useRef, useState } from 'react';
import { CircleAlert, CircleCheck } from 'lucide-react';
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
import { Progress } from '@/components/ui/progress';
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
    const recipientRegistrationIds = useMemo(
        () => recipients.map((r) => r.id),
        [recipients],
    );
    const recipientById = useMemo(
        () => new Map(recipients.map((r) => [r.id, r])),
        [recipients],
    );
    const [error, setError] = useState<string | null>(null);
    const [starting, setStarting] = useState(true);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
        try {
            const jobId = await startBulkSend({
                slot,
                eventId,
                recipientRegistrationIds,
                reportDraftId,
            });

            poll(jobId);
        } catch (err) {
            // El acta caducó o cambiaron los destinatarios: hay que generarla de nuevo.
            if (err instanceof ApiError && isStaleDraftMessage(err.message)) {
                onDraftRejected?.();
            }

            setError(
                err instanceof ApiError
                    ? err.message
                    : 'No se pudo iniciar el envío',
            );
        } finally {
            setStarting(false);
        }
    };

    const handleRetry = () => {
        setError(null);
        setStarting(true);
        void handleSend();
    };

    // Arranca solo, en cuanto se abre el diálogo: no hace falta revisar la
    // lista ni pulsar un botón aparte. Se desacopla con setTimeout para que
    // el envío no dispare estado de forma síncrona dentro del propio efecto.
    useEffect(() => {
        const startId = setTimeout(() => void handleSend(), 0);

        return () => {
            clearTimeout(startId);

            if (pollRef.current) clearInterval(pollRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const finished = status?.done ?? false;
    const results = status?.results ?? [];
    const processedIds = new Set(results.map((r) => r.registrationId));
    const pending = recipients.filter((r) => !processedIds.has(r.id));
    const current = pending[0];
    const succeeded = results.filter((r) => r.ok);
    const failed = results.filter((r) => !r.ok);
    const total = status?.total ?? recipients.length;
    const processed = status ? status.sent + status.failed : 0;
    const progressPct = total > 0 ? (processed / total) * 100 : 0;

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

            {!error && (
                <div className="grid gap-4">
                    <div className="grid gap-1.5">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                                Progreso general
                            </span>
                            <span className="tabular-nums">
                                {processed} de {total}
                            </span>
                        </div>
                        <Progress value={progressPct} />
                    </div>

                    {!finished && (
                        <div className="grid gap-1.5">
                            <p className="truncate text-sm text-muted-foreground">
                                {starting
                                    ? 'Arrancando…'
                                    : current
                                      ? `Enviando a ${personLabel(current)}…`
                                      : 'Terminando…'}
                            </p>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                <div className="h-full w-1/3 animate-[indeterminate-sweep_1.2s_ease-in-out_infinite] rounded-full bg-primary" />
                            </div>
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
                {error ? (
                    <Button type="button" onClick={handleRetry}>
                        Reintentar
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
