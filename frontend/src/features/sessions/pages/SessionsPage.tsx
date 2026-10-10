import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import { IconTooltip } from '@/components/IconTooltip';
import { ListErrors } from '@/features/users/components/ListErrors';
import { PageTitle } from '@/components/PageTitle';
import { scrollbarOptions } from '@/lib/overlayScrollbarsOptions';
import { useSort } from '@/hooks/useSort';
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

    const [search, setSearch] = useState('');

    const filtered = sessions.filter((s) => {
        if (!search) return true;

        const q = search.trim().toLowerCase();

        return (
            s.userName.toLowerCase().includes(q) ||
            s.userEmail.toLowerCase().includes(q)
        );
    });

    const { sorted, sort, toggleSort } = useSort<
        ActiveSession,
        'user' | 'email'
    >(
        filtered,
        {
            user: (a, b) => a.userName.localeCompare(b.userName),
            email: (a, b) => a.userEmail.localeCompare(b.userEmail),
        },
        { key: 'user', dir: 'asc' },
    );

    const columns: DataTableColumn<ActiveSession, 'user' | 'email'>[] = [
        {
            key: 'user',
            header: 'Usuario',
            sortKey: 'user',
            render: (s) => (
                <>
                    {s.userName}
                    {s.current && (
                        <Badge className="ml-2" variant="secondary">
                            Esta sesión
                        </Badge>
                    )}
                </>
            ),
        },
        {
            key: 'email',
            header: 'Correo',
            sortKey: 'email',
            cellClassName: 'break-all',
            render: (s) => s.userEmail,
        },
        {
            key: 'expire',
            header: 'Expira',
            render: (s) => dateFormat.format(new Date(s.expire)),
        },
        {
            key: 'actions',
            header: <span className="sr-only">Acciones</span>,
            align: 'right',
            render: (s) => (
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
            ),
        },
    ];

    return (
        <section>
            <PageTitle>Sesiones activas</PageTitle>

            <ListErrors
                error={error}
                actionError={null}
                onRetry={() => void load()}
            />

            <div className="mb-4">
                <Input
                    placeholder="Buscar por nombre o correo…"
                    className="bg-card w-56"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

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
                    <DataTable
                        columns={columns}
                        rows={sorted}
                        rowKey={(s) => s.sid}
                        sort={sort}
                        onSort={toggleSort}
                    />
                </OverlayScrollbarsComponent>
            )}

            {!loading && sorted.length === 0 && (
                <p className="mt-4 text-muted-foreground">
                    No hay sesiones que coincidan con la búsqueda.
                </p>
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
