import { createContext, useContext } from 'react';
import type { User } from '@/lib/api';

export interface AuthContextValue {
    user: User | null;
    // true mientras se comprueba si ya hay una sesión abierta
    loading: boolean;
    setUser: (user: User | null) => void;
    logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = (): AuthContextValue => {
    const value = useContext(AuthContext);

    if (!value) {
        throw new Error('useAuth debe usarse dentro de <AuthProvider>');
    }

    return value;
};
