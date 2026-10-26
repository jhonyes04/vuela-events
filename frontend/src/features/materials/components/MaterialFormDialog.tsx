import { useState, type SubmitEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { OwnerField } from '@/components/OwnerField';
import { useAuth } from '@/features/auth/hooks/context';
import { ApiError } from '@/lib/api';
import {
    createMaterial,
    updateMaterial,
    type Material,
} from '@/features/materials/lib/materials';

interface MaterialFormBodyProps {
    material: Material | null;
    onSaved: (material: Material) => void;
    onClose: () => void;
}

const MaterialFormBody = ({
    material,
    onSaved,
    onClose,
}: MaterialFormBodyProps) => {
    const { user } = useAuth();
    const canManageOwner = user?.permissions.includes('ownership:manage') ?? false;
    const [name, setName] = useState(material?.name ?? '');
    const [observations, setObservations] = useState(
        material?.observations ?? '',
    );
    const [active, setActive] = useState(material?.active ?? true);
    const [ownerId, setOwnerId] = useState(
        material?.createdById ?? user?.id ?? '',
    );
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: SubmitEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const payload = {
                name,
                observations: observations || undefined,
                ...(canManageOwner && { ownerId: ownerId || undefined }),
            };
            const saved = material
                ? await updateMaterial(material.id, { ...payload, active })
                : await createMaterial(payload);

            toast.success(
                material ? 'Material actualizado.' : 'Material creado.',
            );
            onSaved(saved);
            onClose();
        } catch (error) {
            toast.error(
                error instanceof ApiError
                    ? error.message
                    : 'No se pudo guardar el material',
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>
                    {material ? 'Editar material' : 'Nuevo material'}
                </DialogTitle>
            </DialogHeader>

            <form
                id="material-form"
                onSubmit={(e) => void handleSubmit(e)}
                className="grid gap-4"
            >
                <div className="grid gap-1.5">
                    <Label htmlFor="material-name">Nombre *</Label>
                    <Input
                        id="material-name"
                        required
                        minLength={2}
                        maxLength={100}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>

                <div className="grid gap-1.5">
                    <Label htmlFor="material-observations">Observaciones</Label>
                    <Textarea
                        id="material-observations"
                        maxLength={300}
                        value={observations}
                        onChange={(e) => setObservations(e.target.value)}
                    />
                </div>

                {canManageOwner && (
                    <OwnerField
                        value={ownerId}
                        onValueChange={setOwnerId}
                        disabled={submitting}
                        currentOwner={material?.createdBy ?? null}
                    />
                )}

                {material && (
                    <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                            checked={active}
                            disabled={submitting}
                            onCheckedChange={setActive}
                        />
                        {active ? 'Activo' : 'Desactivado'}
                    </label>
                )}
            </form>

            <DialogFooter>
                <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={submitting}
                >
                    Cancelar
                </Button>
                <Button
                    type="submit"
                    form="material-form"
                    disabled={submitting}
                >
                    {submitting ? 'Guardando…' : 'Guardar'}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
};

interface MaterialFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    // null = crear, material = editar.
    material: Material | null;
    onSaved: (material: Material) => void;
}

export const MaterialFormDialog = ({
    open,
    onOpenChange,
    material,
    onSaved,
}: MaterialFormDialogProps) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        {open && (
            <MaterialFormBody
                key={material?.id ?? 'new'}
                material={material}
                onSaved={onSaved}
                onClose={() => onOpenChange(false)}
            />
        )}
    </Dialog>
);
