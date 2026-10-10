import { Star } from 'lucide-react';

export const Footer = () => (
    <footer className="border-t border-black/10 bg-brand-ink text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-1 px-4 py-4 text-center text-sm sm:flex-row sm:text-left">
            <p className="text-white/80">
                &copy; {new Date().getFullYear()} Vuela Events
            </p>
            <div className="flex items-center gap-1.5">
                <div className="flex flex-col items-end gap-0 5 text-white/40">
                    <span className="flex items-center gap-1 5">
                        Juan Manuel España Redondo
                    </span>
                    <span>Punto Vuela Almáchar</span>
                </div>
                <Star
                    className="size-4 shrink-0 text-yellow-300"
                    fill="currentColor"
                />
            </div>
        </div>
    </footer>
);
