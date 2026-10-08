import { Star } from 'lucide-react';

export const Footer = () => (
    <footer className="border-t border-black/10 bg-brand-ink text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-1 px-4 py-4 text-center text-sm sm:flex-row sm:text-left">
            <p className="text-white/80">
                &copy; {new Date().getFullYear()} Vuela Events
            </p>
            <p className="flex items-center gap-1.5 text-white/40">
                <Star
                    className="size-4 shrink-0 text-yellow-300"
                    fill="currentColor"
                />
                Punto Vuela Almáchar
            </p>
        </div>
    </footer>
);
