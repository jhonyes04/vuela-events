import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { IconTooltip } from '@/components/IconTooltip';
import { useAuth } from '@/features/auth/hooks/context';
import {
    type AppNotification,
    deleteNotifications,
    listNotifications,
    markNotificationRead,
} from '@/features/notifications/lib/notifications';

// Solo tras un login real (flag puesto por GoogleSignIn), nunca al abrir la
// app con una sesión ya existente.
export const LoginNotificationsDialog = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [pending, setPending] = useState<AppNotification[]>([]);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (!user) return;
        if (sessionStorage.getItem('justLoggedIn') !== 'true') return;

        sessionStorage.removeItem('justLoggedIn');

        void listNotifications()
            .then((list) => {
                const unread = list.filter((n) => !n.readAt);

                if (unread.length > 0) {
                    setPending(unread);
                    setOpen(true);
                }
            })
            .catch(() => {});
    }, [user]);

    const remove = (id: string) => {
        setPending((prev) => {
            const next = prev.filter((n) => n.id !== id);

            if (next.length === 0) setOpen(false);

            return next;
        });
    };

    const handleRead = (notification: AppNotification) => {
        remove(notification.id);
        void markNotificationRead(notification.id);
    };

    const handleDelete = (notification: AppNotification) => {
        remove(notification.id);
        void deleteNotifications([notification.id]);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Tienes notificaciones pendientes</DialogTitle>
                    <DialogDescription>
                        {pending.length === 1
                            ? '1 notificación sin leer.'
                            : `${pending.length} notificaciones sin leer.`}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid max-h-96 gap-2 overflow-y-auto">
                    {pending.map((notification) => (
                        <div
                            key={notification.id}
                            className="grid gap-0.5 rounded-xl border bg-brand-yellow/10 p-3"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <span className="text-sm font-medium">
                                    {notification.title}
                                </span>
                                <div className="flex shrink-0 gap-1">
                                    <IconTooltip label="Marcar leída">
                                        <Button
                                            variant="default"
                                            size="icon-sm"
                                            aria-label="Marcar leída"
                                            onClick={() =>
                                                handleRead(notification)
                                            }
                                        >
                                            <Check className="size-4" />
                                        </Button>
                                    </IconTooltip>
                                    <IconTooltip label="Eliminar">
                                        <Button
                                            variant="destructive"
                                            size="icon-sm"
                                            aria-label="Eliminar"
                                            onClick={() =>
                                                handleDelete(notification)
                                            }
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    </IconTooltip>
                                </div>
                            </div>

                            {notification.body && (
                                <span className="text-sm text-muted-foreground">
                                    {notification.body}
                                </span>
                            )}
                        </div>
                    ))}
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => {
                            setOpen(false);
                            navigate('/notificaciones');
                        }}
                    >
                        Ir a Mis notificaciones
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
