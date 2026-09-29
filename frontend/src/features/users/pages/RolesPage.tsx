import { useEffect, useState } from 'react';
import { CircleAlert } from 'lucide-react';
import {
    Alert,
    AlertAction,
    AlertDescription,
    AlertTitle,
} from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CreateRoleDialog } from '@/features/users/components/CreateRoleDialog';
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

export function RolesPage() {
    const [roles, setRoles] = useState<RoleRow[]>([]);
    const [permissions, setPermissions] = useState<PermissionOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

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

    const togglePermission = async (
        role: RoleRow,
        permissionId: string,
        checked: boolean,
    ) => {
        const current = role.permissions.map((p) => p.permissionId);
        const next = checked
            ? [...current, permissionId]
            : current.filter((id) => id !== permissionId);

        setBusyId(role.id);
        setActionError(null);

        try {
            await api.patch(`/roles/${role.id}/permissions`, {
                permissionIds: next,
            });
            await load();
        } catch (e) {
            setActionError(
                e instanceof ApiError
                    ? e.message
                    : 'No se pudo cambiar el permiso',
            );
        } finally {
            setBusyId(null);
        }
    };

    const deleteRole = async (roleId: string) => {
        setBusyId(roleId);
        setActionError(null);

        try {
            await api.delete(`/roles/${roleId}`);
            await load();
        } catch (e) {
            setActionError(
                e instanceof ApiError
                    ? e.message
                    : 'No se pudo eliminar el rol',
            );
        } finally {
            setBusyId(null);
        }
    };

    return (
        <section>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-semibold">Roles</h1>
                <CreateRoleDialog
                    permissions={permissions}
                    onCreated={() => void load()}
                />
            </div>

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
                    Cargando roles…
                </p>
            ) : (
                <div className="grid gap-4">
                    {roles.map((role) => {
                        const granted = new Set(
                            role.permissions.map((p) => p.permissionId),
                        );
                        const busy = busyId === role.id;

                        return (
                            <div
                                key={role.id}
                                className="rounded-xl border bg-card p-4"
                            >
                                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <h2 className="font-medium">
                                            {role.name}
                                        </h2>
                                        <span className="text-xs text-muted-foreground">
                                            {role.id}
                                        </span>
                                        {role.protected && (
                                            <Badge variant="secondary">
                                                Protegido
                                            </Badge>
                                        )}
                                    </div>
                                    {!role.protected && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={busy}
                                            onClick={() =>
                                                void deleteRole(role.id)
                                            }
                                        >
                                            Eliminar
                                        </Button>
                                    )}
                                </div>

                                <div className="grid gap-2 sm:grid-cols-2">
                                    {permissions.map((p) => (
                                        <label
                                            key={p.id}
                                            className="flex items-start gap-2 text-sm"
                                        >
                                            <input
                                                type="checkbox"
                                                className="mt-0.5 size-4 accent-primary"
                                                checked={granted.has(p.id)}
                                                disabled={busy}
                                                onChange={(e) =>
                                                    void togglePermission(
                                                        role,
                                                        p.id,
                                                        e.target.checked,
                                                    )
                                                }
                                            />
                                            <span>{p.description}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
