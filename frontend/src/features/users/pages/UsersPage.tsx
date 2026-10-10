import { useEffect, useState } from 'react';
import { Pencil, FolderKanban, Trash2 } from 'lucide-react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/hooks/context';
import { Button } from '@/components/ui/button';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import { IconTooltip } from '@/components/IconTooltip';
import { EditUserDialog } from '@/features/users/components/EditUserDialog';
import { EditUserProjectsDialog } from '@/features/users/components/EditUserProjectsDialog';
import { ListErrors } from '@/features/users/components/ListErrors';
import { PaginationControls } from '@/components/PaginationControls';
import { usePagination } from '@/hooks/usePagination';
import { useSort } from '@/hooks/useSort';
import { scrollbarOptions } from '@/lib/overlayScrollbarsOptions';
import { useRolesStore } from '@/features/users/store';
import { ROLE_IDS } from '@/features/users/lib/roles';
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
    createdAt: string;
    role: { id: string; name: string };
}

const selectClass =
    'h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50';

export const UsersPage = () => {
    const { user: me } = useAuth();
    const [users, setUsers] = useState<AdminUser[]>([]);
    const roles = useRolesStore((s) => s.items);
    const loadRoles = useRolesStore((s) => s.load);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [editing, setEditing] = useState<AdminUser | null>(null);
    const [editingProjects, setEditingProjects] = useState<AdminUser | null>(
        null,
    );
    const [deleting, setDeleting] = useState<AdminUser | null>(null);

    const {
        sorted: sortedUsers,
        sort,
        toggleSort,
    } = useSort<AdminUser, 'name' | 'lastName' | 'email' | 'role' | 'active'>(
        users,
        {
            name: (a, b) => a.name.localeCompare(b.name),
            lastName: (a, b) => a.lastName.localeCompare(b.lastName),
            email: (a, b) => a.email.localeCompare(b.email),
            role: (a, b) => a.role.name.localeCompare(b.role.name),
            active: (a, b) => Number(a.active) - Number(b.active),
        },
        { key: 'lastName', dir: 'asc' },
    );

    const { paged, page, pageCount, pageSize, total, setPage, setPageSize } =
        usePagination(sortedUsers, 10);

    const columns: DataTableColumn<
        AdminUser,
        'name' | 'lastName' | 'email' | 'role' | 'active'
    >[] = [
        { key: 'name', header: 'Nombre', sortKey: 'name', render: (u) => u.name },
        {
            key: 'lastName',
            header: 'Apellidos',
            sortKey: 'lastName',
            render: (u) => u.lastName,
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
                    <select
                        className={selectClass}
                        value={u.role.id}
                        disabled={isSelf || busy}
                        onChange={(e) =>
                            void changeRole(u.id, e.target.value)
                        }
                    >
                        {roles.map((r) => (
                            <option key={r.id} value={r.id}>
                                {r.name}
                            </option>
                        ))}
                    </select>
                );
            },
        },
        {
            key: 'active',
            header: 'Estado',
            sortKey: 'active',
            render: (u) => (u.active ? 'Activo' : 'Desactivado'),
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
                            label={isSelf ? 'Edítate desde Mi perfil' : 'Editar'}
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
                        {u.role.id === ROLE_IDS.AIL && (
                            <IconTooltip label="Proyectos de interés">
                                <Button
                                    variant="secondary"
                                    size="icon"
                                    aria-label="Proyectos de interés"
                                    disabled={busy}
                                    onClick={() => setEditingProjects(u)}
                                >
                                    <FolderKanban className="size-4" />
                                </Button>
                            </IconTooltip>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={isSelf || busy}
                            onClick={() => void toggleActive(u.id, !u.active)}
                        >
                            {u.active ? 'Desactivar' : 'Activar'}
                        </Button>
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

    const load = async () => {
        setLoading(true);
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
            setLoading(false);
        }
    };

    useEffect(() => {
        void Promise.resolve().then(load);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const changeRole = async (userId: string, roleId: string) => {
        setBusyId(userId);

        try {
            await api.patch(`/users/${userId}/role`, { roleId });
            await load();
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
            await load();
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
            <PageTitle>Gestionar Usuarios</PageTitle>

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
                onSaved={() => void load()}
            />

            <EditUserProjectsDialog
                open={editingProjects !== null}
                onOpenChange={(open) => !open && setEditingProjects(null)}
                user={editingProjects}
            />

            {deleting && (
                <ConfirmDeleteDialog
                    open={deleting !== null}
                    onOpenChange={(open) => !open && setDeleting(null)}
                    title="Eliminar usuario"
                    description={`¿Eliminar a «${deleting.name} ${deleting.lastName}» (${deleting.email})? Esta acción no se puede deshacer.`}
                    confirmLabel="Eliminar"
                    deletingLabel="Eliminando…"
                    errorFallback="No se pudo eliminar el usuario"
                    successLabel={`${deleting.name} ${deleting.lastName} eliminado.`}
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
