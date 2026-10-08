import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import { useAuth } from '@/features/auth/hooks/context';
import { useAuthBootstrap } from '@/features/auth/hooks/useAuthBootstrap';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { OnboardingPage } from '@/features/profile/pages/OnboardingPage';
import { AppRoutes } from '@/routes/AppRoutes';
import { scrollbarOptions } from '@/lib/overlayScrollbarsOptions';

export default function App() {
    useAuthBootstrap();

    const { user, loading } = useAuth();

    return (
        <OverlayScrollbarsComponent
            className="h-[100svh] text-foreground"
            options={scrollbarOptions}
            defer
        >
            <div className="flex min-h-full flex-col">
                <Header />
                <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-10">
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
                <Footer />
            </div>
        </OverlayScrollbarsComponent>
    );
}
