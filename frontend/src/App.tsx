import { useAuth } from '@/auth/context';
import { Header } from '@/components/Header';
import { LoginPage } from '@/pages/LoginPage';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { AppRoutes } from '@/routes/AppRoutes';

export default function App() {
    const { user, loading } = useAuth();

    return (
        <div className="min-h-svh text-foreground">
            <Header />
            <main className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
                {loading ? (
                    <p role="status" className="text-muted-foreground">
                        Cargando…
                    </p>
                ) : !user ? (
                    <LoginPage />
                ) : !user.profileCompleted ? (
                    // Primer acceso: hasta completar el perfil no se ve nada más.
                    <OnboardingPage />
                ) : (
                    <AppRoutes />
                )}
            </main>
        </div>
    );
}
