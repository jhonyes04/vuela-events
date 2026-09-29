import { useEffect, useState } from 'react';
import { CircleAlert } from 'lucide-react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import { useAuth } from '@/features/auth/hooks/context';
import {
    Alert,
    AlertAction,
    AlertDescription,
    AlertTitle,
} from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { PaginationControls } from '@/components/PaginationControls';
import { SortableHeader } from '@/components/SortableHeader';
import { usePagination } from '@/hooks/usePagination';
import { useSort } from '@/hooks/useSort';
import { scrollbarOptions } from '@/lib/overlayScrollbarsOptions';
import { api, ApiError } from '@/lib/api';

interface AdminUser {
    id: string;
    email: string;
    name: string;
    active: boolean;
    createdAt: string;
    role: { id: string; name: string };
}

interface RoleOption {
    id: string;
    name: string;
}

const selectClass =
    'h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50';

export function UsersPage() {
    const { user: me } = useAuth();
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [roles, setRoles] = useState<RoleOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    const { sorted: sortedUsers, sort, toggleSort } = useSort<
        AdminUser,
        'name' | 'email' | 'role' | 'active'
    >(
        users,
        {
            name: (a, b) => a.name.localeCompare(b.name),
            email: (a, b) => a.email.localeCompare(b.email),
            role: (a, b) => a.role.name.localeCompare(b.role.name),
            active: (a, b) => Number(a.active) - Number(b.active),
        },
        { key: 'name', dir: 'asc' },
    );

    const { paged, page, pageCount, pageSize, total, setPage, setPageSize } =
        usePagination(sortedUsers, 25);

    const load = async () => {
        setLoading(true);
        setError(null);

        try {
            const [usersRes, rolesRes] = await Promise.all([
                api.get<{ users: AdminUser[] }>('/users'),
                api.get<{ roles: RoleOption[] }>('/roles'),
            ]);

            setUsers(usersRes.users);
            setRoles(rolesRes.roles);
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

    const changeRole = async (userId: string, roleId: string) => {
        setBusyId(userId);
        setActionError(null);

        try {
            await api.patch(`/users/${userId}/role`, { roleId });
            await load();
        } catch (e) {
            setActionError(
                e instanceof ApiError ? e.message : 'No se pudo cambiar el rol',
            );
        } finally {
            setBusyId(null);
        }
    };

    const toggleActive = async (userId: string, active: boolean) => {
        setBusyId(userId);
        setActionError(null);

        try {
            await api.patch(`/users/${userId}/active`, { active });
            await load();
        } catch (e) {
            setActionError(
                e instanceof ApiError
                    ? e.message
                    : 'No se pudo cambiar el estado',
            );
        } finally {
            setBusyId(null);
        }
    };

    return (
        <section>
            <h1 className="mb-6 text-2xl font-semibold">Usuarios</h1>

            {error && (
                <Alert variant="destructive" className="mb-6">
                    <CircleAlert />
                    <AlertTitle>No se pudo cargar la lista</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                    <AlertAction>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void load()}
                        >
                            Reintentar
                        </Button>
                    </AlertAction>
                </Alert>
            )}

            {actionError && (
                <Alert variant="destructive" className="mb-6">
                    <CircleAlert />
                    <AlertTitle>No se pudo aplicar el cambio</AlertTitle>
                    <AlertDescription>{actionError}</AlertDescription>
                </Alert>
            )}

            {loading ? (
                <p role="status" className="text-muted-foreground">
                    Cargando usuarios…
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
                                <SortableHeader label="Nombre" sortKey="name" sort={sort} onSort={toggleSort} />
                                <SortableHeader label="Correo" sortKey="email" sort={sort} onSort={toggleSort} />
                                <SortableHeader label="Rol" sortKey="role" sort={sort} onSort={toggleSort} />
                                <SortableHeader label="Estado" sortKey="active" sort={sort} onSort={toggleSort} />
                                <th className="p-3 font-bold">
                                    <span className="sr-only">Acciones</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {paged.map((u) => {
                                const isSelf = u.id === me?.id;
                                const busy = busyId === u.id;

                                return (
                                    <tr
                                        key={u.id}
                                        className="border-b last:border-0"
                                    >
                                        <td className="p-3">{u.name}</td>
                                        <td className="p-3 break-all">
                                            {u.email}
                                        </td>
                                        <td className="p-3">
                                            <select
                                                className={selectClass}
                                                value={u.role.id}
                                                disabled={isSelf || busy}
                                                onChange={(e) =>
                                                    void changeRole(
                                                        u.id,
                                                        e.target.value,
                                                    )
                                                }
                                            >
                                                {roles.map((r) => (
                                                    <option
                                                        key={r.id}
                                                        value={r.id}
                                                    >
                                                        {r.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="p-3">
                                            {u.active
                                                ? 'Activo'
                                                : 'Desactivado'}
                                        </td>
                                        <td className="p-3 text-right">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={isSelf || busy}
                                                onClick={() =>
                                                    void toggleActive(
                                                        u.id,
                                                        !u.active,
                                                    )
                                                }
                                            >
                                                {u.active
                                                    ? 'Desactivar'
                                                    : 'Activar'}
                                            </Button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </OverlayScrollbarsComponent>
            )}

            {!loading && (
                <div className="mt-4">
                    <PaginationControls
                        page={page}
                        pageCount={pageCount}
                        pageSize={pageSize}
                        total={total}
                        onPageChange={setPage}
                        onPageSizeChange={setPageSize}
                    />
                </div>
            )}
        </section>
    );
}
