import { useEffect, useState } from 'react';
import { ShieldCheck, Trash2 } from 'lucide-react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { IconTooltip } from '@/components/IconTooltip';
import { CreateRoleDialog } from '@/features/users/components/CreateRoleDialog';
import { ListErrors } from '@/features/users/components/ListErrors';
import { RolePermissionsDialog } from '@/features/users/components/RolePermissionsDialog';
import { scrollbarOptions } from '@/lib/overlayScrollbarsOptions';
import { useRolesStore } from '@/features/users/store';
import type { Role } from '@/features/users/lib/roles';
import { api, ApiError } from '@/lib/api';
import { PageTitle } from '@/components/PageTitle';

interface PermissionOption {
    id: string;
    description: string;
}

export const RolesPage = () => {
    const roles = useRolesStore((s) => s.items);
    const rolesLoading = useRolesStore((s) => s.loading);
    const rolesError = useRolesStore((s) => s.error);
    const loadRoles = useRolesStore((s) => s.load);
    const removeRole = useRolesStore((s) => s.remove);
    const [permissions, setPermissions] = useState<PermissionOption[]>([]);
    const [permissionsLoading, setPermissionsLoading] = useState(true);
    const [permissionsError, setPermissionsError] = useState<string | null>(
        null,
    );
    const [editingId, setEditingId] = useState<string | null>(null);
    const [permissionsOpen, setPermissionsOpen] = useState(false);
    const [deleting, setDeleting] = useState<Role | null>(null);

    const loadPermissions = async () => {
        setPermissionsLoading(true);
        setPermissionsError(null);

        try {
            const res = await api.get<{ permissions: PermissionOption[] }>(
                '/roles/permissions',
            );

            setPermissions(res.permissions);
        } catch (e) {
            setPermissionsError(
                e instanceof ApiError
                    ? e.message
                    : 'No se pudo cargar la lista',
            );
        } finally {
            setPermissionsLoading(false);
        }
    };

    const load = () => Promise.all([loadRoles(true), loadPermissions()]);

    // Al entrar se refresca, pero los roles en caché se ven mientras tanto.
    useEffect(() => {
        void loadRoles(true);
        void Promise.resolve().then(loadPermissions);
    }, [loadRoles]);

    const loading = rolesLoading || permissionsLoading;
    const error = rolesError ?? permissionsError;

    const openPermissions = (roleId: string) => {
        setEditingId(roleId);
        setPermissionsOpen(true);
    };

    // El rol que edita el diálogo se busca siempre en la lista actual,
    // para que se refresque solo tras cada cambio de permiso.
    const editingRole = roles.find((r) => r.id === editingId) ?? null;

    return (
        <section>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <PageTitle>Gestionar Roles</PageTitle>
                <CreateRoleDialog
                    permissions={permissions}
                    onCreated={() => void load()}
                />
            </div>

            <ListErrors
                error={error}
                actionError={null}
                onRetry={() => void load()}
            />

            {loading ? (
                <p role="status" className="text-muted-foreground">
                    Cargando roles…
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
                                <th className="p-3 font-bold">Nombre</th>
                                <th className="p-3 font-bold">Identificador</th>
                                <th className="p-3 font-bold">Estado</th>
                                <th className="p-3 font-bold">
                                    <span className="sr-only">Acciones</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {roles.map((role) => (
                                <tr
                                    key={role.id}
                                    className="border-b last:border-0"
                                >
                                    <td className="p-3">{role.name}</td>
                                    <td className="p-3 text-muted-foreground">
                                        {role.id}
                                    </td>
                                    <td className="p-3">
                                        {role.protected && (
                                            <Badge variant="secondary">
                                                Protegido
                                            </Badge>
                                        )}
                                    </td>
                                    <td className="p-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <IconTooltip label="Editar permisos">
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    aria-label="Editar permisos"
                                                    onClick={() =>
                                                        openPermissions(role.id)
                                                    }
                                                >
                                                    <ShieldCheck className="size-4" />
                                                </Button>
                                            </IconTooltip>
                                            {!role.protected && (
                                                <IconTooltip label="Eliminar">
                                                    <Button
                                                        variant="destructive"
                                                        size="icon"
                                                        aria-label="Eliminar"
                                                        onClick={() =>
                                                            setDeleting(role)
                                                        }
                                                    >
                                                        <Trash2 className="size-4" />
                                                    </Button>
                                                </IconTooltip>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </OverlayScrollbarsComponent>
            )}

            <RolePermissionsDialog
                open={permissionsOpen}
                onOpenChange={setPermissionsOpen}
                role={editingRole}
                permissions={permissions}
                onChanged={() => void load()}
            />

            {deleting && (
                <ConfirmDeleteDialog
                    open={deleting !== null}
                    onOpenChange={(open) => !open && setDeleting(null)}
                    title="Eliminar rol"
                    description={`¿Eliminar «${deleting.name}»? Esta acción no se puede deshacer.`}
                    confirmLabel="Eliminar"
                    deletingLabel="Eliminando…"
                    errorFallback="No se pudo eliminar el rol"
                    successLabel={`Rol «${deleting.name}» eliminado.`}
                    onConfirm={() => api.delete(`/roles/${deleting.id}`)}
                    onDeleted={() => {
                        removeRole(deleting.id);
                        setDeleting(null);
                    }}
                />
            )}
        </section>
    );
};
