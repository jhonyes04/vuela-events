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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ApiError } from '@/lib/api';
import {
    cleanText,
    DINAMIZADOR_OPTIONS,
    MIN_LENGTH,
    NAME_MAX,
    PUNTO_VUELA_MAX,
    type DinamizadorTitle,
} from '@/features/profile/lib/profile';
import { ROLE_IDS, type Role } from '@/features/users/lib/roles';
import { updateUserProfile } from '@/features/users/lib/users';

export interface EditableUser {
    id: string;
    email: string;
    name: string;
    lastName: string;
    puntoVuela: string | null;
    dinamizadorTitle: DinamizadorTitle | null;
    role: { id: string; name: string };
}

interface EditUserBodyProps {
    user: EditableUser;
    roles: Role[];
    onOpenChange: (open: boolean) => void;
    onSaved: () => void;
}

// Con su propio estado: se recrea (key) al cambiar de usuario.
const EditUserBody = ({
    user,
    roles,
    onOpenChange,
    onSaved,
}: EditUserBodyProps) => {
    const [name, setName] = useState(user.name);
    const [lastName, setLastName] = useState(user.lastName);
    const [puntoVuela, setPuntoVuela] = useState(user.puntoVuela ?? '');
    const [dinamizadorTitle, setDinamizadorTitle] =
        useState<DinamizadorTitle | null>(user.dinamizadorTitle);
    const [submitting, setSubmitting] = useState(false);

    // Igual que en "Mi perfil": solo lo necesita quien envía correos y no es admin.
    const role = roles.find((r) => r.id === user.role.id);
    const needsTitle =
        user.role.id !== ROLE_IDS.ADMIN &&
        (role?.permissions.some((p) => p.permissionId === 'email:send') ??
            false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        const values = {
            name: cleanText(name),
            lastName: cleanText(lastName),
            puntoVuela: cleanText(puntoVuela),
        };

        if (
            values.name.length < MIN_LENGTH ||
            values.lastName.length < MIN_LENGTH ||
            values.puntoVuela.length < MIN_LENGTH
        ) {
            toast.error(
                `Escribe al menos ${MIN_LENGTH} caracteres en cada campo.`,
            );
            return;
        }

        if (needsTitle && !dinamizadorTitle) {
            toast.error('Elige Dinamizador o Dinamizadora.');
            return;
        }

        setSubmitting(true);

        try {
            await updateUserProfile(user.id, {
                ...values,
                dinamizadorTitle: needsTitle ? dinamizadorTitle : null,
            });

            toast.success('Usuario actualizado.');
            onSaved();
            onOpenChange(false);
        } catch (err) {
            toast.error(
                err instanceof ApiError
                    ? err.message
                    : 'No se pudo guardar el usuario',
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Editar usuario</DialogTitle>
                <DialogDescription>{user.email}</DialogDescription>
            </DialogHeader>

            <form onSubmit={(e) => void handleSubmit(e)} className="grid gap-4">
                <div className="grid gap-1.5">
                    <Label htmlFor="edit-user-name">Nombre</Label>
                    <Input
                        id="edit-user-name"
                        required
                        minLength={MIN_LENGTH}
                        maxLength={NAME_MAX}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>

                <div className="grid gap-1.5">
                    <Label htmlFor="edit-user-last-name">Apellidos</Label>
                    <Input
                        id="edit-user-last-name"
                        required
                        minLength={MIN_LENGTH}
                        maxLength={NAME_MAX}
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                    />
                </div>

                <div className="grid gap-1.5">
                    <Label htmlFor="edit-user-punto">Punto Vuela / zona</Label>
                    <Input
                        id="edit-user-punto"
                        required
                        minLength={MIN_LENGTH}
                        maxLength={PUNTO_VUELA_MAX}
                        value={puntoVuela}
                        onChange={(e) => setPuntoVuela(e.target.value)}
                    />
                </div>

                {needsTitle && (
                    <div className="grid gap-2">
                        <Label>Cargo en el acta de asistencia</Label>
                        <RadioGroup
                            className="flex flex-wrap gap-4"
                            value={dinamizadorTitle ?? ''}
                            onValueChange={(value) =>
                                setDinamizadorTitle(value as DinamizadorTitle)
                            }
                        >
                            {DINAMIZADOR_OPTIONS.map((option) => (
                                <div
                                    key={option.value}
                                    className="flex items-center gap-2"
                                >
                                    <RadioGroupItem
                                        id={`edit-user-title-${option.value}`}
                                        value={option.value}
                                    />
                                    <Label
                                        htmlFor={`edit-user-title-${option.value}`}
                                    >
                                        {option.label}
                                    </Label>
                                </div>
                            ))}
                        </RadioGroup>
                    </div>
                )}

                <DialogFooter>
                    <Button type="submit" disabled={submitting}>
                        {submitting ? 'Guardando…' : 'Guardar'}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    );
};

interface EditUserDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    // null = nada que editar (el diálogo no se muestra).
    user: EditableUser | null;
    roles: Role[];
    onSaved: () => void;
}

export const EditUserDialog = ({
    open,
    onOpenChange,
    user,
    roles,
    onSaved,
}: EditUserDialogProps) => {
    if (!user) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <EditUserBody
                key={user.id}
                user={user}
                roles={roles}
                onOpenChange={onOpenChange}
                onSaved={onSaved}
            />
        </Dialog>
    );
};
