import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { IconTooltip } from '@/components/IconTooltip';
import { ListErrors } from '@/features/users/components/ListErrors';
import { PageTitle } from '@/components/PageTitle';
import { scrollbarOptions } from '@/lib/overlayScrollbarsOptions';
import { ApiError } from '@/lib/api';
import {
    listActiveSessions,
    revokeSession,
    type ActiveSession,
} from '@/features/sessions/lib/sessions';

const dateFormat = new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
});

export const SessionsPage = () => {
    const [sessions, setSessions] = useState<ActiveSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [revoking, setRevoking] = useState<ActiveSession | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);

        try {
            setSessions(await listActiveSessions());
        } catch (e) {
            setError(
                e instanceof ApiError
                    ? e.message
                    : 'No se pudo cargar la lista',
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void Promise.resolve().then(load);
    }, []);

    return (
        <section>
            <PageTitle>Sesiones activas</PageTitle>

            <ListErrors
                error={error}
                actionError={null}
                onRetry={() => void load()}
            />

            {loading ? (
                <p role="status" className="text-muted-foreground">
                    Cargando sesiones…
                </p>
            ) : (
                <OverlayScrollbarsComponent
                    className="rounded-xl border bg-card"
                    options={scrollbarOptions}
                    defer
                >
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b bg-muted/50 text-left">
                                <th className="p-3 font-bold">Usuario</th>
                                <th className="p-3 font-bold">Correo</th>
                                <th className="p-3 font-bold">Expira</th>
                                <th className="p-3 font-bold">
                                    <span className="sr-only">Acciones</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {sessions.map((s) => (
                                <tr
                                    key={s.sid}
                                    className="border-b last:border-0"
                                >
                                    <td className="p-3">
                                        {s.userName}
                                        {s.current && (
                                            <Badge
                                                className="ml-2"
                                                variant="secondary"
                                            >
                                                Esta sesión
                                            </Badge>
                                        )}
                                    </td>
                                    <td className="p-3 break-all">
                                        {s.userEmail}
                                    </td>
                                    <td className="p-3">
                                        {dateFormat.format(new Date(s.expire))}
                                    </td>
                                    <td className="p-3 text-right">
                                        <IconTooltip
                                            label={
                                                s.current
                                                    ? 'No puedes cerrar tu propia sesión aquí'
                                                    : 'Cerrar sesión'
                                            }
                                        >
                                            <Button
                                                variant="destructive"
                                                size="icon"
                                                aria-label="Cerrar sesión"
                                                disabled={s.current}
                                                onClick={() => setRevoking(s)}
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </IconTooltip>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </OverlayScrollbarsComponent>
            )}

            {revoking && (
                <ConfirmDeleteDialog
                    open={revoking !== null}
                    onOpenChange={(open) => !open && setRevoking(null)}
                    title="Cerrar sesión"
                    description={`¿Cerrar la sesión de «${revoking.userName}»? Tendrá que volver a iniciar sesión.`}
                    confirmLabel="Cerrar sesión"
                    deletingLabel="Cerrando…"
                    errorFallback="No se pudo cerrar la sesión"
                    successLabel="Sesión cerrada."
                    onConfirm={() => revokeSession(revoking.sid)}
                    onDeleted={() => {
                        setSessions((prev) =>
                            prev.filter((s) => s.sid !== revoking.sid),
                        );
                        setRevoking(null);
                    }}
                />
            )}
        </section>
    );
};
