import { useEffect } from 'react';
import { api, setUnauthorizedHandler, type User } from '@/lib/api';
import { useAuthStore } from '@/features/auth/store';

// Arranque de la sesión: se llama una sola vez, en <App />.
export const useAuthBootstrap = () => {
    const setUser = useAuthStore((s) => s.setUser);
    const setLoading = useAuthStore((s) => s.setLoading);

    // Un 401 con sesión abierta (caducada o usuario desactivado) recarga la
    // página, igual que el logout. Sin sesión no hace nada: si no, el arranque
    // (/auth/me) o un login fallido provocarían recargas en bucle.
    useEffect(() => {
        setUnauthorizedHandler(() => {
            if (useAuthStore.getState().user) {
                window.location.replace('/');
            }
        });

        return () => setUnauthorizedHandler(null);
    }, []);

    // Al arrancar, pregunta al servidor si ya hay una sesión válida.
    useEffect(() => {
        let cancelled = false;

        api.get<{ user: User }>('/auth/me')
            .then((res) => {
                if (!cancelled) setUser(res.user);
            })
            .catch(() => {
                if (!cancelled) setUser(null);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [setUser, setLoading]);
};
