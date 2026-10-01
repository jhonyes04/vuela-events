import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { api, type User } from '@/lib/api';
import { useAuthStore } from '@/features/auth/store';

export interface AuthValue {
    user: User | null;
    loading: boolean;
    setUser: (user: User | null) => void;
    logout: () => Promise<void>;
}

export const useAuth = (): AuthValue => {
    const user = useAuthStore((s) => s.user);
    const loading = useAuthStore((s) => s.loading);
    const setUser = useAuthStore((s) => s.setUser);
    const navigate = useNavigate();

    const logout = useCallback(async () => {
        try {
            await api.post('/auth/logout');
        } finally {
            setUser(null);
            navigate('/');
        }
    }, [navigate, setUser]);

    return { user, loading, setUser, logout };
};
