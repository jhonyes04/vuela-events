import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/hooks/context';
import { SendNotificationDialog } from '@/features/notifications/components/SendNotificationDialog';

// Autocontenido: resuelve el permiso (solo dt/admin) y lleva su propio
// diálogo, para que la página que lo use no tenga que saber nada de esto.
export const SendNotificationButton = () => {
    const { user } = useAuth();
    const [open, setOpen] = useState(false);

    if (user?.roleId !== 'dt' && user?.roleId !== 'admin') return null;

    return (
        <>
            <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => setOpen(true)}
            >
                Enviar notificación
            </Button>

            <SendNotificationDialog open={open} onOpenChange={setOpen} />
        </>
    );
};
