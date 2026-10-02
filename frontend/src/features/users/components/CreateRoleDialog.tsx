import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PermissionsFieldset } from '@/features/users/components/PermissionsFieldset';
import { api, ApiError } from '@/lib/api';

interface PermissionOption {
    id: string;
    description: string;
}

const EMPTY = { id: '', name: '', permissionIds: [] as string[] };

export function CreateRoleDialog({
    permissions,
    onCreated,
}: {
    permissions: PermissionOption[];
    onCreated: () => void;
}) {
    const [open, setOpen] = useState(false);
    const [values, setValues] = useState(EMPTY);
    const [submitting, setSubmitting] = useState(false);

    const handleOpenChange = (next: boolean) => {
        setOpen(next);

        if (next) {
            setValues(EMPTY);
        }
    };

    const togglePermission = (id: string) =>
        setValues((v) => ({
            ...v,
            permissionIds: v.permissionIds.includes(id)
                ? v.permissionIds.filter((p) => p !== id)
                : [...v.permissionIds, id],
        }));

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            await api.post('/roles', values);
            setOpen(false);
            toast.success('Rol creado.');
            onCreated();
        } catch (err) {
            toast.error(
                err instanceof ApiError
                    ? err.message
                    : 'No se pudo crear el rol',
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <Button onClick={() => handleOpenChange(true)}>Crear rol</Button>

            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Crear rol</DialogTitle>
                        <DialogDescription>
                            El identificador no se puede cambiar después.
                        </DialogDescription>
                    </DialogHeader>

                    <form
                        id="create-role-form"
                        onSubmit={(e) => void handleSubmit(e)}
                        className="grid gap-4"
                    >
                        <div className="grid gap-1.5">
                            <Label htmlFor="role-id">Identificador *</Label>
                            <Input
                                id="role-id"
                                required
                                minLength={2}
                                maxLength={40}
                                pattern="[a-z][a-z0-9_-]*"
                                placeholder="coordinador"
                                value={values.id}
                                onChange={(e) =>
                                    setValues((v) => ({
                                        ...v,
                                        id: e.target.value,
                                    }))
                                }
                            />
                        </div>

                        <div className="grid gap-1.5">
                            <Label htmlFor="role-name">Nombre *</Label>
                            <Input
                                id="role-name"
                                required
                                minLength={2}
                                maxLength={80}
                                placeholder="Coordinador"
                                value={values.name}
                                onChange={(e) =>
                                    setValues((v) => ({
                                        ...v,
                                        name: e.target.value,
                                    }))
                                }
                            />
                        </div>

                        <div className="grid gap-1.5">
                            <p className="text-sm font-medium">Permisos</p>
                            <PermissionsFieldset
                                permissions={permissions}
                                checked={new Set(values.permissionIds)}
                                onToggle={(id) => togglePermission(id)}
                            />
                        </div>

                    </form>

                    <DialogFooter>
                        <Button
                            type="submit"
                            form="create-role-form"
                            disabled={submitting}
                        >
                            {submitting ? 'Creando…' : 'Crear rol'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
