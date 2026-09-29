import { CircleAlert } from 'lucide-react';
import {
    Alert,
    AlertAction,
    AlertDescription,
    AlertTitle,
} from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface ListErrorsProps {
    error: string | null;
    actionError: string | null;
    onRetry: () => void;
}

export const ListErrors = ({
    error,
    actionError,
    onRetry,
}: ListErrorsProps) => (
    <>
        {error && (
            <Alert variant="destructive" className="mb-6">
                <CircleAlert />
                <AlertTitle>No se pudo cargar la lista</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
                <AlertAction>
                    <Button variant="outline" size="sm" onClick={onRetry}>
                        Reintentar
                    </Button>
                </AlertAction>
            </Alert>
        )}

        {actionError && (
            <Alert variant="destructive" className="mb-6">
                <CircleAlert />
                <AlertTitle>No se pudo aplicar el cambio</AlertTitle>
                <AlertDescription>{actionError}</AlertDescription>
            </Alert>
        )}
    </>
);
