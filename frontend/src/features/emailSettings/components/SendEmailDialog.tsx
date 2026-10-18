import { useEffect, useMemo, useRef, useState } from 'react';
import { Circle, CircleAlert, CircleCheck, CircleXIcon } from 'lucide-react';
import { createPortal } from 'react-dom';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import { scrollbarOptions } from '@/lib/overlayScrollbarsOptions';
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
// A partir de este número de destinatarios, la lista deja de crecer y pasa
// a hacer scroll (max-h-60 ≈ 10 filas con el tamaño de texto actual).
const MAX_VISIBLE_RECIPIENTS = 10;

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

// Portal a document.body, igual que FullScreenSpinner/MaintenanceNoticeProgress:
// la app vive dentro de OverlayScrollbarsComponent (App.tsx), que atraparía un
// position:fixed normal. Sin usar el Dialog compartido a propósito: así este
// overlay tiene su propio fondo (bg-black/50) sin afectar a los demás diálogos.
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
    const [error, setError] = useState<string | null>(null);
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
        }
    };

    const handleRetry = () => {
        setError(null);
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
    const resultByRegistrationId = new Map(
        results.map((r) => [r.registrationId, r]),
    );
    const processedIds = new Set(results.map((r) => r.registrationId));
    const pending = recipients.filter((r) => !processedIds.has(r.id));
    const current = pending[0];
    const succeeded = results.filter((r) => r.ok);
    const failed = results.filter((r) => !r.ok);
    const total = status?.total ?? recipients.length;
    const processed = status ? status.sent + status.failed : 0;
    const progressPct = total > 0 ? (processed / total) * 100 : 0;

    return createPortal(
        <div className="fixed inset-0 isolate z-[100] grid place-items-center bg-black/50 p-4 supports-backdrop-filter:backdrop-blur-xs">
            <div className="grid w-full max-w-md gap-4 rounded-xl bg-card p-5 text-card-foreground">
                <div className="grid gap-1">
                    <h2 className="text-sm font-medium">
                        Enviar {slotLabel.toLowerCase()}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {recipients.length}{' '}
                        {recipients.length === 1
                            ? 'destinatario seleccionado'
                            : 'destinatarios seleccionados'}
                        .
                    </p>
                </div>

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

                        {finished && (
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
                        )}

                        {recipients.length > 0 && (
                            <Card size="sm">
                                <CardHeader>
                                    <CardTitle className="text-xs font-medium text-muted-foreground">
                                        Destinatarios ({recipients.length})
                                    </CardTitle>
                                </CardHeader>

                                <CardContent>
                                    <OverlayScrollbarsComponent
                                        options={scrollbarOptions}
                                        defer
                                        className={
                                            recipients.length >
                                            MAX_VISIBLE_RECIPIENTS
                                                ? 'max-h-60'
                                                : undefined
                                        }
                                    >
                                        <ul className="grid gap-1 text-sm">
                                            {recipients.map((recipient) => {
                                                const result =
                                                    resultByRegistrationId.get(
                                                        recipient.id,
                                                    );
                                                const isCurrent =
                                                    recipient.id ===
                                                    current?.id;

                                                return (
                                                    <li
                                                        key={recipient.id}
                                                        className="flex items-start gap-2"
                                                    >
                                                        {result ? (
                                                            result.ok ? (
                                                                <CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                                                            ) : (
                                                                <CircleXIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
                                                            )
                                                        ) : isCurrent ? (
                                                            <Spinner
                                                                variant="icon"
                                                                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                                                            />
                                                        ) : (
                                                            <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground/40" />
                                                        )}
                                                        <span
                                                            className={
                                                                result
                                                                    ? undefined
                                                                    : 'text-muted-foreground'
                                                            }
                                                        >
                                                            {personLabel(
                                                                recipient,
                                                            )}
                                                            {result?.ok ===
                                                                false &&
                                                                result.error && (
                                                                    <span className="text-muted-foreground">
                                                                        {' '}
                                                                        —{' '}
                                                                        {
                                                                            result.error
                                                                        }
                                                                    </span>
                                                                )}
                                                        </span>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </OverlayScrollbarsComponent>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}

                {error && (
                    <Alert variant="destructive">
                        <CircleAlert />
                        <AlertTitle>{error}</AlertTitle>
                    </Alert>
                )}

                <div className="flex justify-end">
                    {error ? (
                        <Button type="button" onClick={handleRetry}>
                            Reintentar
                        </Button>
                    ) : (
                        <Button disabled={!finished} onClick={onClose}>
                            Cerrar
                        </Button>
                    )}
                </div>
            </div>
        </div>,
        document.body,
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

    const handleClose = () => {
        onOpenChange(false);

        if (status?.done) {
            onFinishedClose();
        }
    };

    if (!open) return null;

    return (
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
            onClose={handleClose}
        />
    );
};
