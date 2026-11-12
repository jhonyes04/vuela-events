import { useState } from 'react';
import { Monitor, Trash2 } from 'lucide-react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/SearchInput';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import { IconTooltip } from '@/components/IconTooltip';
import { ListErrors } from '@/features/users/components/ListErrors';
import { PageTitle } from '@/components/PageTitle';
import { scrollbarOptions } from '@/lib/overlayScrollbarsOptions';
import { useSort } from '@/hooks/useSort';
import { useAsyncList } from '@/hooks/useAsyncList';
import { formatShortDateTime } from '@/lib/dateFormat';
import {
    listActiveSessions,
    revokeSession,
    type ActiveSession,
} from '@/features/sessions/lib/sessions';

export const SessionsPage = () => {
    const {
        items: sessions,
        setItems: setSessions,
        loading,
        error,
        load,
    } = useAsyncList(listActiveSessions, 'No se pudo cargar la lista');
    const [revoking, setRevoking] = useState<ActiveSession | null>(null);
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
        'user' | 'email' | 'expire' | 'loginAt'
    >(
        filtered,
        {
            user: (a, b) => a.userName.localeCompare(b.userName),
            email: (a, b) => a.userEmail.localeCompare(b.userEmail),
            expire: (a, b) => a.expire.localeCompare(b.expire),
            loginAt: (a, b) => (a.loginAt ?? '').localeCompare(b.loginAt ?? ''),
        },
        { key: 'expire', dir: 'asc' },
    );

    const columns: DataTableColumn<
        ActiveSession,
        'user' | 'email' | 'expire' | 'loginAt'
    >[] = [
        {
            key: 'user',
            header: 'Usuario',
            sortKey: 'user',

            render: (s) => (
                <>
                    {s.puntoVuela ? `${s.puntoVuela} (${s.name})` : s.userName}
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
            headerClassName: 'hidden sm:inline-block',
            cellClassName: 'hidden sm:inline-block breack-al',
            render: (s) => s.userEmail,
        },
        {
            key: 'loginAt',
            header: 'Inicio',
            sortKey: 'loginAt',
            render: (s) =>
                s.loginAt ? formatShortDateTime(new Date(s.loginAt)) : '—',
        },
        {
            key: 'expire',
            header: 'Expira',
            sortKey: 'expire',
            render: (s) => formatShortDateTime(new Date(s.expire)),
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
            <PageTitle icon={Monitor}>Sesiones activas</PageTitle>

            <ListErrors
                error={error}
                actionError={null}
                onRetry={() => void load()}
            />

            <div className="mb-4">
                <SearchInput
                    value={search}
                    onChange={setSearch}
                    placeholder="Buscar por nombre o correo…"
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
                    description={`¿Cerrar la sesión de «${revoking.puntoVuela} (${revoking.userName})»? Tendrá que volver a iniciar sesión.`}
                    confirmLabel="Cerrar sesión"
                    deletingLabel="Cerrando…"
                    errorFallback="No se pudo cerrar la sesión"
                    successLabel="Sesión cerrada."
                    confirmText={revoking.puntoVuela ?? undefined}
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
