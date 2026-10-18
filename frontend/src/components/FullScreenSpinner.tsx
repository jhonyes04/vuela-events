import { createPortal } from 'react-dom';
import { Spinner } from '@/components/ui/spinner';

interface FullScreenSpinnerProps {
    label: string;
}

// Portal a document.body: la app vive dentro de OverlayScrollbarsComponent
// (App.tsx), que crea su propio contenedor de scroll. Un Dialog escapa de ahí
// porque también se porta a document.body; sin portal, este spinner se queda
// atrapado dentro del wrapper y aparece detrás aunque tenga más z-index.
export const FullScreenSpinner = ({ label }: FullScreenSpinnerProps) =>
    createPortal(
        <div className="fixed inset-0 isolate z-[100] grid place-items-center bg-black/50 supports-backdrop-filter:backdrop-blur-xs">
            <div className="flex flex-col items-center gap-3">
                <Spinner className="size-16 text-white" />
                <p className="text-sm font-medium text-white">{label}</p>
            </div>
        </div>,
        document.body,
    );
