import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/auth/context';
import { config } from '@/config';
import { api, ApiError, type User } from '@/lib/api';
import { loadGoogleScript } from '@/lib/googleScript';
import { CircleAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const DOMAIN_HINT = 'puntosvuela.es';

export function GoogleSignIn() {
    const { setUser } = useAuth();
    const navigate = useNavigate();
    const buttonRef = useRef<HTMLDivElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [attempt, setAttempt] = useState(0);
    // El superadmin entra con una cuenta fuera del dominio: sin la pista de dominio.
    const [otherAccount, setOtherAccount] = useState(false);

    const handleCredential = useCallback(
        async (credential: string) => {
            try {
                const { user } = await api.post<{ user: User }>(
                    '/auth/google',
                    { credential },
                );

                setError(null);
                setUser(user);
                navigate('/');
            } catch (e) {
                setError(
                    e instanceof ApiError
                        ? e.message
                        : 'No se pudo iniciar sesión',
                );
                setAttempt((n) => n + 1);
            }
        },
        [setUser, navigate],
    );

    useEffect(() => {
        let cancelled = false;

        const setup = async () => {
            try {
                const [{ nonce }] = await Promise.all([
                    api.get<{ nonce: string }>('/auth/nonce'),
                    loadGoogleScript(),
                ]);

                const google = window.google;
                const container = buttonRef.current;

                if (cancelled || !google || !container) return;

                google.accounts.id.initialize({
                    client_id: config.googleClientId,
                    nonce,
                    ...(otherAccount ? {} : { hd: DOMAIN_HINT }),
                    auto_select: false,
                    callback: (response) => {
                        void handleCredential(response.credential);
                    },
                });

                container.replaceChildren();
                google.accounts.id.renderButton(container, {
                    type: 'standard',
                    theme: 'outline',
                    size: 'large',
                    text: 'signin_with',
                    shape: 'rectangular',
                    locale: 'es',
                });
            } catch (e) {
                if (!cancelled) {
                    setError(
                        e instanceof Error
                            ? e.message
                            : 'No se pudo preparar el inicio de sesión',
                    );
                }
            }
        };

        void setup();

        return () => {
            cancelled = true;
        };
    }, [attempt, otherAccount, handleCredential]);

    return (
        <div className="flex flex-col items-center gap-3">
            <div ref={buttonRef} />
            {!otherAccount && (
                <button
                    type="button"
                    onClick={() => setOtherAccount(true)}
                    className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                >
                    ¿Entras con una cuenta fuera de @{DOMAIN_HINT}?
                </button>
            )}
            {error && (
                <Alert variant="destructive" className="max-w-sm">
                    <CircleAlert />
                    <AlertTitle>No se pudo iniciar sesión</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
        </div>
    );
}
