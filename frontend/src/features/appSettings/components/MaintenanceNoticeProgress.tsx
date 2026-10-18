import { Circle, CircleAlert, CircleCheck, CircleXIcon } from 'lucide-react';
import { createPortal } from 'react-dom';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import { scrollbarOptions } from '@/lib/overlayScrollbarsOptions';
import type { MaintenanceNoticeJobStatus } from '@/features/appSettings/lib/appSettings';

// A partir de este número de destinatarios, la lista deja de crecer y pasa
// a hacer scroll (max-h-60 ≈ 10 filas con el tamaño de texto actual).
const MAX_VISIBLE_RECIPIENTS = 10;

interface MaintenanceNoticeProgressProps {
    status: MaintenanceNoticeJobStatus | null;
    onClose: () => void;
}

// Portal a document.body, igual que FullScreenSpinner: la app vive dentro de
// OverlayScrollbarsComponent (App.tsx), que atraparía un position:fixed normal.
export const MaintenanceNoticeProgress = ({
    status,
    onClose,
}: MaintenanceNoticeProgressProps) => {
    const finished = status?.done ?? false;
    const recipients = status?.recipients ?? [];
    const results = status?.results ?? [];
    const resultByEmail = new Map(results.map((r) => [r.email, r]));
    const succeeded = results.filter((r) => r.ok);
    const failed = results.filter((r) => !r.ok);
    const total = status?.total ?? 0;
    const processed = status ? status.sent + status.failed : 0;
    const progressPct = total > 0 ? (processed / total) * 100 : 0;
    // El primero de la lista sin resultado todavía: a quién se le está
    // enviando ahora mismo (results solo llega cuando un envío termina).
    const current = recipients.find((r) => !resultByEmail.has(r.email));

    return createPortal(
        <div className="fixed inset-0 isolate z-[100] grid place-items-center bg-black/50 p-4 supports-backdrop-filter:backdrop-blur-xs">
            <div className="grid w-full max-w-md gap-4 rounded-xl bg-card p-5 text-card-foreground">
                <div className="flex items-center gap-3">
                    {!finished && <Spinner className="size-6 shrink-0" />}
                    <h2 className="text-sm font-medium">
                        {finished
                            ? 'Aviso de mantenimiento enviado'
                            : 'Enviando aviso de mantenimiento…'}
                    </h2>
                </div>

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
                        variant={failed.length > 0 ? 'destructive' : 'success'}
                    >
                        {failed.length > 0 ? <CircleAlert /> : <CircleCheck />}
                        <AlertTitle>
                            {succeeded.length} enviados
                            {failed.length > 0 && `, ${failed.length} fallidos`}
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
                                    recipients.length > MAX_VISIBLE_RECIPIENTS
                                        ? 'max-h-60'
                                        : undefined
                                }
                            >
                                <ul className="grid gap-1 text-sm">
                                    {recipients.map((r) => {
                                        const result = resultByEmail.get(
                                            r.email,
                                        );
                                        const isCurrent =
                                            r.email === current?.email;

                                        return (
                                            <li
                                                key={r.email}
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
                                                    {r.label}
                                                    {result?.ok === false &&
                                                        result.error && (
                                                            <span className="text-muted-foreground">
                                                                {' '}
                                                                — {result.error}
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

                {finished && (
                    <div className="flex justify-end">
                        <Button onClick={onClose}>Cerrar</Button>
                    </div>
                )}
            </div>
        </div>,
        document.body,
    );
};
