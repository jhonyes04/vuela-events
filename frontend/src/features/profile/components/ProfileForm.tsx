import { useState, type FormEvent } from 'react';
import { CircleAlert, CircleCheck } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError, type User } from '@/lib/api';
import {
    cleanText,
    MIN_LENGTH,
    NAME_MAX,
    PUNTO_VUELA_MAX,
    puntoVueloHints,
    updateProfile,
    type ProfileValues,
} from '@/features/profile/lib/profile';

// Formulario compartido por la pantalla de bienvenida y "Mi perfil".
export function ProfileForm({
    user,
    initial,
    submitLabel,
    showSuccess,
    onSaved,
}: {
    user: User;
    // Valores iniciales de los campos; por defecto, los datos guardados del perfil.
    initial?: ProfileValues;
    submitLabel: string;
    // "Mi perfil" confirma el guardado; en la bienvenida la pantalla simplemente cambia.
    showSuccess: boolean;
    onSaved: (user: User) => void;
}) {
    const [name, setName] = useState(initial?.name ?? user.name);
    const [lastName, setLastName] = useState(
        initial?.lastName ?? user.lastName,
    );
    const [puntoVuela, setPuntoVuela] = useState(
        initial?.puntoVuela ?? user.puntoVuela ?? '',
    );
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const hints = puntoVueloHints(user.roleId);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setSaved(false);

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
            setError(
                `Escribe al menos ${MIN_LENGTH} caracteres en cada campo.`,
            );
            return;
        }

        setSubmitting(true);

        try {
            const updated = await updateProfile(values);

            // Se muestra lo que el servidor guardó (ya normalizado).
            setName(updated.name);
            setLastName(updated.lastName);
            setPuntoVuela(updated.puntoVuela ?? '');
            setSaved(true);
            onSaved(updated);
        } catch (err) {
            setError(
                err instanceof ApiError
                    ? err.message
                    : 'No se pudo guardar el perfil',
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={(e) => void handleSubmit(e)} className="grid gap-4">
            <div className="grid gap-2 sm:grid-cols-2">
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

            <div className="grid gap-1.5">
                <Label htmlFor="profile-punto">{hints.label}</Label>
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
                {hints.help && (
                    <p
                        id="profile-punto-help"
                        className="text-sm text-muted-foreground"
                    >
                        {hints.help}
                    </p>
                )}
            </div>

            {error && (
                <Alert variant="destructive">
                    <CircleAlert />
                    <AlertTitle>No se pudo guardar</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {showSuccess && saved && (
                <Alert variant="success">
                    <CircleCheck />
                    <AlertTitle>Perfil actualizado</AlertTitle>
                </Alert>
            )}

            <Button
                type="submit"
                size="lg"
                className="w-full sm:w-auto sm:justify-self-start"
                disabled={submitting}
            >
                {submitting ? 'Guardando…' : submitLabel}
            </Button>
        </form>
    );
}
