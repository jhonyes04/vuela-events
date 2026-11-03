import { useEffect, useMemo, useState } from 'react';
import {
    Pencil,
    Search,
    Trash2,
    UserCog,
    UserCheck,
    UserX,
} from 'lucide-react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/hooks/context';
import { Button } from '@/components/ui/button';
import { ComboboxField } from '@/components/ComboboxField';
import { Input } from '@/components/ui/input';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import { IconTooltip } from '@/components/IconTooltip';
import { EditUserDialog } from '@/features/users/components/EditUserDialog';
import { ListErrors } from '@/features/users/components/ListErrors';
import { PaginationControls } from '@/components/PaginationControls';
import { usePagination } from '@/hooks/usePagination';
import { useSort } from '@/hooks/useSort';
import { scrollbarOptions } from '@/lib/overlayScrollbarsOptions';
import { useRolesStore } from '@/features/users/store';

import { api, ApiError } from '@/lib/api';
import type { DinamizadorTitle } from '@/features/profile/lib/profile';
import { PageTitle } from '@/components/PageTitle';

interface AdminUser {
    id: string;
    email: string;
    name: string;
    lastName: string;
    puntoVuela: string | null;
    dinamizadorTitle: DinamizadorTitle | null;
    active: boolean;
    isSuperadmin: boolean;
    createdAt: string;
    role: { id: string; name: string };
}

const normalize = (value: string) =>
    value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const STATUS_OPTIONS = [
    { value: 'all', label: 'Todos' },
    { value: 'active', label: 'Activos' },
    { value: 'inactive', label: 'Inactivos' },
] as const;

export const UsersPage = () => {
    const { user: me } = useAuth();
    const [users, setUsers] = useState<AdminUser[]>([]);
    const roles = useRolesStore((s) => s.items);
    const loadRoles = useRolesStore((s) => s.load);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [editing, setEditing] = useState<AdminUser | null>(null);
    const [deleting, setDeleting] = useState<AdminUser | null>(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<
        'all' | 'active' | 'inactive'
    >('all');

    const filteredUsers = useMemo(() => {
        const term = normalize(search.trim());

        return users.filter((u) => {
            if (statusFilter === 'active' && !u.active) return false;
            if (statusFilter === 'inactive' && u.active) return false;
            if (!term) return true;

            return [u.name, u.lastName, u.puntoVuela ?? ''].some((field) =>
                normalize(field).includes(term),
            );
        });
    }, [users, search, statusFilter]);

    const {
        sorted: sortedUsers,
        sort,
        toggleSort,
    } = useSort<
        AdminUser,
        'puntoVuela' | 'lastName' | 'email' | 'role' | 'active'
    >(
        filteredUsers,
        {
            puntoVuela: (a, b) =>
                (a.puntoVuela ?? '').localeCompare(b.puntoVuela ?? ''),
            lastName: (a, b) => a.lastName.localeCompare(b.lastName),
            email: (a, b) => a.email.localeCompare(b.email),
            role: (a, b) => a.role.name.localeCompare(b.role.name),
            active: (a, b) => Number(a.active) - Number(b.active),
        },
        { key: 'puntoVuela', dir: 'asc' },
    );

    const { paged, page, pageCount, pageSize, total, setPage, setPageSize } =
        usePagination(sortedUsers, 10);

    const columns: DataTableColumn<
        AdminUser,
        'puntoVuela' | 'lastName' | 'email' | 'role' | 'active'
    >[] = [
        {
            key: 'puntoVuela',
            header: 'Punto Vuela',
            sortKey: 'puntoVuela',
            render: (u) => u.puntoVuela ?? '—',
        },
        {
            key: 'fullName',
            header: 'Nombre y apellidos',
            sortKey: 'lastName',
            render: (u) => `${u.name} ${u.lastName}`,
        },
        {
            key: 'email',
            header: 'Correo',
            sortKey: 'email',
            cellClassName: 'break-all',
            render: (u) => u.email,
        },
        {
            key: 'role',
            header: 'Rol',
            sortKey: 'role',
            render: (u) => {
                const isSelf = u.id === me?.id;
                const busy = busyId === u.id;

                return (
                    <ComboboxField
                        className="w-36 bg-transparent"
                        items={roles}
                        getValue={(r) => r.id}
                        getLabel={(r) => r.name}
                        value={u.role.id}
                        disabled={isSelf || busy}
                        onValueChange={(v) => void changeRole(u.id, v)}
                        searchable={false}
                    />
                );
            },
        },
        {
            key: 'active',
            header: 'Estado',
            sortKey: 'active',
            render: (user) => {
                const isSelf = user.id === me?.id;
                const busy = busyId === user.id;

                return (
                    <IconTooltip label={user.active ? 'Desactivar' : 'Activar'}>
                        <Button
                            type="button"
                            variant="default"
                            size="icon"
                            disabled={isSelf || busy}
                            aria-label={user.active ? 'Desactivar' : 'Activar'}
                            onClick={() =>
                                void toggleActive(user.id, !user.active)
                            }
                            className={`mx-auto disabled:cursor-not-allowed disabled:opacity-50 ${user.active ? 'bg-green-600' : 'bg-destructive'}`}
                        >
                            {user.active ? (
                                <UserCheck className="size-4 text-white" />
                            ) : (
                                <UserX className="size-4 text-white" />
                            )}
                        </Button>
                    </IconTooltip>
                );
            },
        },
        {
            key: 'actions',
            header: <span className="sr-only">Acciones</span>,
            align: 'right',
            cellClassName: 'flex justify-end gap-2',
            render: (u) => {
                const isSelf = u.id === me?.id;
                const busy = busyId === u.id;

                return (
                    <>
                        <IconTooltip
                            label={
                                isSelf ? 'Edítate desde Mi perfil' : 'Editar'
                            }
                        >
                            <Button
                                variant="secondary"
                                size="icon"
                                aria-label="Editar"
                                disabled={isSelf || busy}
                                onClick={() => setEditing(u)}
                            >
                                <Pencil className="size-4" />
                            </Button>
                        </IconTooltip>
                        <IconTooltip label="Eliminar">
                            <Button
                                variant="destructive"
                                size="icon"
                                aria-label="Eliminar"
                                disabled={isSelf || busy}
                                onClick={() => setDeleting(u)}
                            >
                                <Trash2 className="size-4" />
                            </Button>
                        </IconTooltip>
                    </>
                );
            },
        },
    ];

    const load = async (silent = false) => {
        if (!silent) setLoading(true);
        setError(null);

        try {
            const [usersRes] = await Promise.all([
                api.get<{ users: AdminUser[] }>('/users'),
                loadRoles(true),
            ]);

            setUsers(usersRes.users);
        } catch (e) {
            setError(
                e instanceof ApiError
                    ? e.message
                    : 'No se pudo cargar la lista',
            );
        } finally {
            if (!silent) setLoading(false);
        }
    };

    useEffect(() => {
        void Promise.resolve().then(() => load());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const changeRole = async (userId: string, roleId: string) => {
        setBusyId(userId);

        try {
            await api.patch(`/users/${userId}/role`, { roleId });
            await load(true);
            toast.success('Rol actualizado.');
        } catch (e) {
            toast.error(
                e instanceof ApiError ? e.message : 'No se pudo cambiar el rol',
            );
        } finally {
            setBusyId(null);
        }
    };

    const toggleActive = async (userId: string, active: boolean) => {
        setBusyId(userId);

        try {
            await api.patch(`/users/${userId}/active`, { active });
            await load(true);
            toast.success(
                active ? 'Usuario activado.' : 'Usuario desactivado.',
            );
        } catch (e) {
            toast.error(
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
            <PageTitle icon={UserCog}>Gestionar Usuarios</PageTitle>

            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative bg-card w-full sm:w-100">
                    <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Buscar por nombre, apellidos o Punto Vuela…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-8"
                    />
                </div>

                <ComboboxField
                    className="w-full bg-card sm:w-40"
                    items={STATUS_OPTIONS}
                    getValue={(s) => s.value}
                    getLabel={(s) => s.label}
                    value={statusFilter}
                    onValueChange={(v) =>
                        setStatusFilter(v as 'all' | 'active' | 'inactive')
                    }
                    searchable={false}
                    placeholder="Estado"
                />
            </div>

            <ListErrors
                error={error}
                actionError={null}
                onRetry={() => void load()}
            />

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
                    <DataTable
                        columns={columns}
                        rows={paged}
                        rowKey={(u) => u.id}
                        sort={sort}
                        onSort={toggleSort}
                    />
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

            <EditUserDialog
                open={editing !== null}
                onOpenChange={(open) => !open && setEditing(null)}
                user={editing}
                roles={roles}
                onSaved={() => void load(true)}
            />

            {deleting && (
                <ConfirmDeleteDialog
                    open={deleting !== null}
                    onOpenChange={(open) => !open && setDeleting(null)}
                    title="Eliminar usuario"
                    description={`¿Eliminar a «${deleting.puntoVuela} (${deleting.name})»?`}
                    confirmText={deleting.puntoVuela ?? undefined}
                    confirmLabel="Eliminar"
                    deletingLabel="Eliminando…"
                    errorFallback="No se pudo eliminar el usuario"
                    successLabel={`${deleting.puntoVuela} (${deleting.name}) eliminado.`}
                    onConfirm={() => api.delete(`/users/${deleting.id}`)}
                    onDeleted={() => {
                        setUsers((prev) =>
                            prev.filter((u) => u.id !== deleting.id),
                        );
                        setDeleting(null);
                    }}
                />
            )}
        </section>
    );
};
