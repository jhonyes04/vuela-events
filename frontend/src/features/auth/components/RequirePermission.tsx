import type { ReactNode } from 'react';
import { CircleAlert } from 'lucide-react';
import { useAuth } from '@/auth/context';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function RequirePermission({
    permissions,
    children,
}: {
    permissions: string[];
    children: ReactNode;
}) {
    const { user } = useAuth();

    if (
        !user ||
        !permissions.some((permission) => user.permissions.includes(permission))
    ) {
        return (
            <Alert variant="destructive" className="mx-auto max-w-md">
                <CircleAlert />
                <AlertTitle>Sin permisos</AlertTitle>
                <AlertDescription>
                    No tienes permisos para ver esta sección
                </AlertDescription>
            </Alert>
        );
    }

    return <>{children}</>;
}
