import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ApiError, type User } from '@/lib/api';
import {
    cleanText,
    DINAMIZADOR_OPTIONS,
    MIN_LENGTH,
    NAME_MAX,
    PUNTO_VUELA_MAX,
    puntoVueloHints,
    updateProfile,
    type DinamizadorTitle,
    type ProfileValues,
} from '@/features/profile/lib/profile';

// Formulario compartido por la pantalla de bienvenida y "Mi perfil".
export function ProfileForm({
    user,
    initial,
    submitLabel,
    showSuccess,
    layout = 'row',
    onSaved,
}: {
    user: User;
    // Valores iniciales de los campos; por defecto, los datos guardados del perfil.
    initial?: ProfileValues;
    submitLabel: string;
    // "Mi perfil" confirma el guardado; en la bienvenida la pantalla simplemente cambia.
    showSuccess: boolean;
    layout?: 'row' | 'stack';
    onSaved: (user: User) => void;
}) {
    const [name, setName] = useState(initial?.name ?? user.name);
    const [lastName, setLastName] = useState(
        initial?.lastName ?? user.lastName,
    );
    const [puntoVuela, setPuntoVuela] = useState(
        initial?.puntoVuela ?? user.puntoVuela ?? '',
    );
    const [dinamizadorTitle, setDinamizadorTitle] =
        useState<DinamizadorTitle | null>(
            initial?.dinamizadorTitle ?? user.dinamizadorTitle,
        );
    const [submitting, setSubmitting] = useState(false);

    const hints = puntoVueloHints(user.roleId);
    // Admin no firma actas: no necesita cargo.
    const needsTitle = user.roleId !== 'admin';

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
            const updated = await updateProfile({
                ...values,
                dinamizadorTitle: needsTitle ? dinamizadorTitle : null,
            });

            // Se muestra lo que el servidor guardó (ya normalizado).
            setName(updated.name);
            setLastName(updated.lastName);
            setPuntoVuela(updated.puntoVuela ?? '');
            setDinamizadorTitle(updated.dinamizadorTitle);

            if (showSuccess) toast.success('Perfil actualizado.');

            onSaved(updated);
        } catch (err) {
            toast.error(
                err instanceof ApiError
                    ? err.message
                    : 'No se pudo guardar el perfil',
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={(e) => void handleSubmit(e)} className="grid gap-6">
            <section className="grid gap-4">
                <h3 className="text-sm font-medium text-muted-foreground">
                    Datos personales
                </h3>
                <div
                    className={
                        layout === 'row'
                            ? 'grid gap-4 sm:grid-cols-2'
                            : 'grid gap-4'
                    }
                >
                    <div className="grid gap-1.5">
                        <Label htmlFor="profile-name">Nombre</Label>
                        <Input
                            id="profile-name"
                            required
                            autoComplete="given-name"
                            minLength={MIN_LENGTH}
                            maxLength={NAME_MAX}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="profile-last-name">Apellidos</Label>
                        <Input
                            id="profile-last-name"
                            required
                            autoComplete="family-name"
                            minLength={MIN_LENGTH}
                            maxLength={NAME_MAX}
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                        />
                    </div>
                </div>
            </section>

            <section className="grid gap-4">
                <h3 className="text-sm font-medium text-muted-foreground">
                    {hints.label}
                </h3>
                <div className="grid gap-1.5">
                    <Label htmlFor="profile-punto" className="sr-only">
                        {hints.label}
                    </Label>
                    <Input
                        id="profile-punto"
                        required
                        minLength={MIN_LENGTH}
                        maxLength={PUNTO_VUELA_MAX}
                        placeholder={hints.placeholder}
                        aria-describedby={
                            hints.help ? 'profile-punto-help' : undefined
                        }
                        value={puntoVuela}
                        onChange={(e) => setPuntoVuela(e.target.value)}
                    />
                </div>
                {/* {hints.help && (
                    <p
                        id="profile-punto-help"
                        className="text-sm text-muted-foreground"
                    >
                        {hints.help}
                    </p>
                )} */}
            </section>

            {needsTitle && (
            <section className="grid gap-4">
                <div className="grid gap-1">
                    <h3 className="text-sm font-medium text-muted-foreground">
                        Cargo en el acta de asistencia
                    </h3>
                    <p className="text-xs text-muted-foreground">
                        Aparece en el acta que generas al enviar el parte de
                        firmas.
                    </p>
                </div>
                <RadioGroup
                    className="grid gap-3 sm:grid-cols-2"
                    value={dinamizadorTitle ?? ''}
                    onValueChange={(value) =>
                        setDinamizadorTitle(value as DinamizadorTitle)
                    }
                >
                    {DINAMIZADOR_OPTIONS.map((option) => (
                        <Label
                            key={option.value}
                            htmlFor={`dinamizador-${option.value}`}
                            className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 font-medium has-[[data-checked]]:border-primary has-[[data-checked]]:bg-primary/5"
                        >
                            <RadioGroupItem
                                id={`dinamizador-${option.value}`}
                                value={option.value}
                            />
                            {option.label}
                        </Label>
                    ))}
                </RadioGroup>
            </section>
            )}

            <div className="flex justify-end">
                <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full sm:w-auto"
                >
                    {submitting ? 'Guardando…' : submitLabel}
                </Button>
            </div>
        </form>
    );
}
