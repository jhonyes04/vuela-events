import { Construction } from 'lucide-react';
import { GoogleSignIn } from '@/features/auth/components/GoogleSignIn';

export interface MaintenancePageProps {
    // Se activa haciendo clic en la estrella del Footer.
    showLogin: boolean;
}

export const MaintenancePage = ({ showLogin }: MaintenancePageProps) => (
    <section className="mx-auto w-full max-w-lg overflow-hidden rounded-3xl shadow-2xl ring-1 ring-black/5">
        <div className="relative flex flex-col items-center gap-6 overflow-hidden bg-gradient-to-br from-brand-ink via-brand-ink to-brand-green/70 px-6 py-16 text-center sm:px-12">
            <div className="pointer-events-none absolute -top-20 -left-16 size-64 rounded-full bg-brand-yellow/20 blur-3xl" />
            <div className="pointer-events-none absolute -right-16 -bottom-20 size-72 rounded-full bg-brand-green/40 blur-3xl" />

            <div className="relative flex size-16 items-center justify-center rounded-2xl bg-white/10 text-brand-yellow ring-1 ring-white/20 backdrop-blur-sm">
                <Construction className="size-8" />
            </div>

            <div className="relative grid gap-2">
                <h1 className="text-2xl font-semibold text-white sm:text-3xl">
                    Estamos en mantenimiento
                </h1>
                <p className="mx-auto max-w-sm text-sm text-white/70 sm:text-base">
                    Estamos haciendo ajustes.
                </p>
                <p className="mx-auto max-w-sm text-sm text-white/70 sm:text-base">
                    Prueba a recargar la página en unos minutos.
                </p>
            </div>

            {showLogin && (
                // El superadmin puede ser una cuenta fuera de @puntosvuela.es:
                // sin hd, el selector de Google no la filtra por dominio
                // (el backend igual solo deja pasar al email de SUPERADMIN_EMAIL).
                <div className="relative rounded-xl bg-white p-3">
                    <GoogleSignIn otherAccount={true} />
                </div>
            )}
        </div>
    </section>
);
