import { useState, type FormEvent } from 'react';
import { CircleAlert, CircleCheck, Eye, EyeOff } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError, type User } from '@/lib/api';
import {
    clearAppPassword,
    setAppPassword,
} from '@/features/profile/lib/profile';

// Gestiona la contraseña de aplicación de Gmail usada para enviar correos
// masivos. Nunca se muestra el valor guardado, solo si hay uno configurado.
export function AppPasswordSection({
    user,
    onSaved,
}: {
    user: User;
    onSaved: (configured: boolean) => void;
}) {
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setSaved(false);
        setSubmitting(true);

        try {
            const configured = await setAppPassword(password);

            setPassword('');
            setSaved(true);
            onSaved(configured);
        } catch (err) {
            setError(
                err instanceof ApiError
                    ? err.message
                    : 'No se pudo guardar la contraseña',
            );
        } finally {
            setSubmitting(false);
        }
    };

    const handleClear = async () => {
        setError(null);
        setSaved(false);
        setSubmitting(true);

        try {
            const configured = await clearAppPassword();

            onSaved(configured);
        } catch (err) {
            setError(
                err instanceof ApiError
                    ? err.message
                    : 'No se pudo quitar la contraseña',
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="grid gap-4">
            <div className="grid gap-1">
                <h2 className="text-sm font-medium">
                    Contraseña de aplicación para enviar correos
                </h2>
                <p className="text-sm text-muted-foreground">
                    Se usa para enviar los correos masivos desde tu cuenta de
                    Gmail. No es tu contraseña normal de Google: genera una{' '}
                    <a
                        href="https://myaccount.google.com/apppasswords"
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                    >
                        contraseña de aplicación
                    </a>{' '}
                    y pégala aquí. Se guarda cifrada y nunca se muestra.
                </p>
            </div>

            <Alert>
                {user.smtpAppPasswordConfigured ? (
                    <CircleCheck />
                ) : (
                    <CircleAlert />
                )}
                <AlertTitle>
                    {user.smtpAppPasswordConfigured
                        ? 'Configurada'
                        : 'No configurada'}
                </AlertTitle>
            </Alert>

            <form onSubmit={(e) => void handleSubmit(e)} className="grid gap-4">
                <div className="grid gap-1.5">
                    <Label htmlFor="app-password">
                        {user.smtpAppPasswordConfigured
                            ? 'Reemplazar contraseña de aplicación'
                            : 'Contraseña de aplicación'}
                    </Label>
                    <div className="relative">
                        <Input
                            id="app-password"
                            type={showPassword ? 'text' : 'password'}
                            required
                            autoComplete="off"
                            className="pr-8"
                            value={password}
                            onChange={(e) =>
                                setPassword(e.target.value.replace(/\s+/g, ''))
                            }
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground"
                            aria-label={
                                showPassword
                                    ? 'Ocultar contraseña'
                                    : 'Mostrar contraseña'
                            }
                        >
                            {showPassword ? (
                                <EyeOff className="size-4" />
                            ) : (
                                <Eye className="size-4" />
                            )}
                        </button>
                    </div>
                </div>

                {error && (
                    <Alert variant="destructive">
                        <CircleAlert />
                        <AlertTitle>No se pudo guardar</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {saved && (
                    <Alert variant="success">
                        <CircleCheck />
                        <AlertTitle>Contraseña guardada</AlertTitle>
                    </Alert>
                )}

                <div className="flex gap-2 ms-auto">
                    <Button type="submit" disabled={submitting}>
                        {submitting ? 'Guardando…' : 'Guardar'}
                    </Button>

                    {user.smtpAppPasswordConfigured && (
                        <Button
                            type="button"
                            variant="destructive"
                            disabled={submitting}
                            onClick={() => void handleClear()}
                        >
                            Quitar
                        </Button>
                    )}
                </div>
            </form>
        </div>
    );
}
