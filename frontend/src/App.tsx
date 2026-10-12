import { useEffect, useState } from 'react';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import { useAuth } from '@/features/auth/hooks/context';
import { useAuthBootstrap } from '@/features/auth/hooks/useAuthBootstrap';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { OnboardingPage } from '@/features/profile/pages/OnboardingPage';
import { MaintenancePage } from '@/features/maintenance/pages/MaintenancePage';
import { AppRoutes } from '@/routes/AppRoutes';
import { scrollbarOptions } from '@/lib/overlayScrollbarsOptions';
import { getMaintenanceStatus } from '@/features/appSettings/lib/appSettings';

export default function App() {
    useAuthBootstrap();

    const { user, loading } = useAuth();
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [checkingMaintenance, setCheckingMaintenance] = useState(true);
    const [superadminLoginOpen, setSuperadminLoginOpen] = useState(false);

    useEffect(() => {
        void getMaintenanceStatus()
            .then(({ maintenanceMode }) => setMaintenanceMode(maintenanceMode))
            .catch(() => setMaintenanceMode(false))
            .finally(() => setCheckingMaintenance(false));
    }, []);

    const blockedByMaintenance =
        maintenanceMode && !(user?.isSuperadmin ?? false);

    return (
        <OverlayScrollbarsComponent
            className="h-[100svh] text-foreground"
            options={scrollbarOptions}
            defer
        >
            <div className="flex min-h-full flex-col">
                <Header />
                <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-10">
                    {loading || checkingMaintenance ? (
                        <p role="status" className="text-muted-foreground">
                            Cargando…
                        </p>
                    ) : blockedByMaintenance ? (
                        // Con o sin sesión: se ve mantenimiento. La estrella
                        // del Footer dispara el login de superadmin (el
                        // backend acepta /api/auth/* siempre).
                        <MaintenancePage showLogin={superadminLoginOpen} />
                    ) : !user ? (
                        <LoginPage />
                    ) : !user.profileCompleted ? (
                        // Primer acceso: hasta completar el perfil no se ve nada más.
                        <OnboardingPage />
                    ) : (
                        <AppRoutes />
                    )}
                </main>
                <Footer
                    onAdminStarClick={
                        blockedByMaintenance
                            ? () => setSuperadminLoginOpen(true)
                            : undefined
                    }
                />
            </div>
        </OverlayScrollbarsComponent>
    );
}
