import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { api, setUnauthorizedHandler, type User } from '@/lib/api';
import { useAuthStore } from '@/features/auth/store';

// Arranque de la sesión: se llama una sola vez, en <App />.
export const useAuthBootstrap = () => {
    const setUser = useAuthStore((s) => s.setUser);
    const setLoading = useAuthStore((s) => s.setLoading);
    const navigate = useNavigate();

    // Cualquier 401 del servidor (sesión caducada, usuario desactivado)
    // cierra la sesión en pantalla.
    useEffect(() => {
        setUnauthorizedHandler(() => {
            setUser(null);
            navigate('/');
        });

        return () => setUnauthorizedHandler(null);
    }, [navigate, setUser]);

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
