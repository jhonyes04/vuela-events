import { useState } from 'react';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { PermissionsFieldset } from '@/features/users/components/PermissionsFieldset';
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

interface RolePermissionsBodyProps {
    role: RoleRow;
    permissions: PermissionOption[];
    onChanged: () => void;
}

const RolePermissionsBody = ({
    role,
    permissions,
    onChanged,
}: RolePermissionsBodyProps) => {
    const [granted, setGranted] = useState(
        () => new Set(role.permissions.map((p) => p.permissionId)),
    );
    const [busy, setBusy] = useState(false);

    const persist = async (next: Set<string>) => {
        setBusy(true);

        try {
            await api.patch(`/roles/${role.id}/permissions`, {
                permissionIds: [...next],
            });
            onChanged();
        } catch (e) {
            toast.error(
                e instanceof ApiError
                    ? e.message
                    : 'No se pudo cambiar el permiso',
            );
        } finally {
            setBusy(false);
        }
    };

    const isAdmin = role.id === 'admin';

    const togglePermission = (permissionId: string, isChecked: boolean) => {
        let next: Set<string> = new Set();

        setGranted((prev) => {
            next = new Set(prev);

            if (isChecked) {
                next.add(permissionId);
            } else {
                next.delete(permissionId);
            }

            return next;
        });

        return persist(next);
    };

    return (
        <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
                <DialogTitle>Permisos de {role.name}</DialogTitle>
                <DialogDescription>
                    {isAdmin
                        ? 'El rol admin siempre tiene todos los permisos: no se pueden quitar.'
                        : 'Los cambios se guardan al momento.'}
                </DialogDescription>
            </DialogHeader>

            <PermissionsFieldset
                permissions={permissions}
                checked={granted}
                onToggle={togglePermission}
                disabled={busy || isAdmin}
            />

            <DialogFooter showCloseButton />
        </DialogContent>
    );
};

interface RolePermissionsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    // null = nada que editar (el diálogo no se muestra).
    role: RoleRow | null;
    permissions: PermissionOption[];
    onChanged: () => void;
}

export const RolePermissionsDialog = ({
    open,
    onOpenChange,
    role,
    permissions,
    onChanged,
}: RolePermissionsDialogProps) => {
    if (!role) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <RolePermissionsBody
                key={role.id}
                role={role}
                permissions={permissions}
                onChanged={onChanged}
            />
        </Dialog>
    );
};
