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
import { api, ApiError } from '@/lib/api';

interface RoleRow {
    id: string;
    name: string;
    protected: boolean;
    permissions: { permissionId: string }[];
}

interface PermissionOption {
    id: string;
    description: string;
}

export const RolesPage = () => {
    const [roles, setRoles] = useState<RoleRow[]>([]);
    const [permissions, setPermissions] = useState<PermissionOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [permissionsOpen, setPermissionsOpen] = useState(false);
    const [deleting, setDeleting] = useState<RoleRow | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);

        try {
            const [rolesRes, permissionsRes] = await Promise.all([
                api.get<{ roles: RoleRow[] }>('/roles'),
                api.get<{ permissions: PermissionOption[] }>(
                    '/roles/permissions',
                ),
            ]);

            setRoles(rolesRes.roles);
            setPermissions(permissionsRes.permissions);
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
                <h1 className="text-2xl font-semibold">Roles</h1>
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
                                <th className="p-3 font-bold">
                                    Identificador
                                </th>
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
                                                        openPermissions(
                                                            role.id,
                                                        )
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
                    onConfirm={() => api.delete(`/roles/${deleting.id}`)}
                    onDeleted={() => {
                        setRoles((prev) =>
                            prev.filter((r) => r.id !== deleting.id),
                        );
                        setDeleting(null);
                    }}
                />
            )}
        </section>
    );
};
