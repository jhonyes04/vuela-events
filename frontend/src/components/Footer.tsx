import { Star } from 'lucide-react';

export interface FooterProps {
    // Solo se pasa en modo mantenimiento: convierte la estrella decorativa
    // en el disparador del login de superadmin.
    onAdminStarClick?: () => void;
}

export const Footer = ({ onAdminStarClick }: FooterProps = {}) => (
    <footer className="border-t border-black/10 bg-brand-ink text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-1 px-4 py-4 text-center text-sm sm:flex-row sm:text-left">
            <p className="text-white/80">
                &copy; {new Date().getFullYear()} Vuela Events
            </p>
            <div className="flex items-center gap-1.5">
                <div className="flex flex-col items-end gap-0 5 text-white/40">
                    <span className="flex items-center gap-1 5">Juannma</span>
                    <span>Punto Vuela Almáchar</span>
                </div>
                {onAdminStarClick ? (
                    <button
                        type="button"
                        onClick={onAdminStarClick}
                        aria-label="Iniciar sesión como superadmin"
                        className="shrink-0 transition-opacity hover:opacity-80"
                    >
                        <Star className="size-4 text-yellow-300" fill="currentColor" />
                    </button>
                ) : (
                    <Star
                        className="size-4 shrink-0 text-yellow-300"
                        fill="currentColor"
                    />
                )}
            </div>
        </div>
    </footer>
);
