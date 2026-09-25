import type { ReactNode } from 'react';
import { CircleAlert } from 'lucide-react';
import { useAuth } from '@/auth/context';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { Role } from '@/lib/api';

// Solo oculta pantallas: el backend es quien impide realmente el acceso a los datos.
export function RequireRole({
    roles,
    children,
}: {
    roles: Role[];
    children: ReactNode;
}) {
    const { user } = useAuth();

    if (!user || !roles.includes(user.role)) {
        return (
            <Alert variant="destructive" className="mx-auto max-w-md">
                <CircleAlert />
                <AlertTitle>Sin permisos</AlertTitle>
                <AlertDescription>
                    No tienes permisos para ver esta sección.
                </AlertDescription>
            </Alert>
        );
    }

    return <>{children}</>;
}
