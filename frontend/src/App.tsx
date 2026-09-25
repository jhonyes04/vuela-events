import { Route, Routes } from 'react-router';
import { useAuth } from '@/auth/context';
import { RequireRole } from '@/auth/RequireRole';
import { Header } from '@/components/Header';
import { EventsPage } from '@/pages/EventsPage';
import { LoginPage } from '@/pages/LoginPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { UsersPage } from '@/pages/UsersPage';

export default function App() {
    const { user, loading } = useAuth();

    return (
        <div className="min-h-svh bg-background text-foreground">
            <Header />
            <main className="mx-auto max-w-6xl px-4 py-10">
                {loading ? (
                    <p role="status" className="text-muted-foreground">
                        Cargando…
                    </p>
                ) : !user ? (
                    <LoginPage />
                ) : (
                    <Routes>
                        <Route path="/" element={<EventsPage />} />
                        <Route
                            path="/admin/usuarios"
                            element={
                                <RequireRole roles={['admin']}>
                                    <UsersPage />
                                </RequireRole>
                            }
                        />
                        <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                )}
            </main>
        </div>
    );
}
