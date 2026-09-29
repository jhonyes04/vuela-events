import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
import { useNavigate } from 'react-router';
import { api, setUnauthorizedHandler, type User } from '@/lib/api';
import { AuthContext } from '@/features/auth/hooks/context';

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // Cualquier 401 del servidor (sesión caducada, usuario desactivado)
    // cierra la sesión en pantalla.
    useEffect(() => {
        setUnauthorizedHandler(() => {
            setUser(null);
            navigate('/');
        });

        return () => setUnauthorizedHandler(null);
    }, [navigate]);

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
    }, []);

    const logout = useCallback(async () => {
        try {
            await api.post('/auth/logout');
        } finally {
            setUser(null);
            navigate('/');
        }
    }, [navigate]);

    const value = useMemo(
        () => ({ user, loading, setUser, logout }),
        [user, loading, logout],
    );

    return <AuthContext value={value}>{children}</AuthContext>;
}
