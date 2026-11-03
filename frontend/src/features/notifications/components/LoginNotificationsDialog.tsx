import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { NOTIFICATION_TYPE_ICONS } from '@/features/notifications/components/NotificationDetailDialog';
import { useAuth } from '@/features/auth/hooks/context';
import {
    type AppNotification,
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

    // Leída = desaparece de la lista al momento, sin esperar la respuesta.
    const handleRead = (notification: AppNotification) => {
        setPending((prev) => {
            const next = prev.filter((n) => n.id !== notification.id);

            if (next.length === 0) setOpen(false);

            return next;
        });

        markNotificationRead(notification.id).catch((e: unknown) => {
            toast.error(
                e instanceof ApiError
                    ? e.message
                    : 'No se pudo guardar como leída',
            );
        });
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
                    {pending.map((notification) => {
                        const Icon =
                            NOTIFICATION_TYPE_ICONS[notification.type] ??
                            Bell;

                        return (
                            <div
                                key={notification.id}
                                className="grid cursor-pointer gap-2 rounded-xl border p-3"
                                onClick={() => handleRead(notification)}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-yellow/30 text-brand-ink">
                                        <Icon className="size-4" />
                                    </span>
                                    <div className="grid gap-0.5">
                                        <span className="text-sm font-medium">
                                            {notification.title}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {formatDistanceToNow(
                                                new Date(
                                                    notification.createdAt,
                                                ),
                                                { locale: es, addSuffix: true },
                                            )}
                                        </span>
                                    </div>
                                </div>

                                {notification.body && (
                                    <p className="rounded-xl bg-muted/60 p-2 text-xs whitespace-pre-line">
                                        {notification.body}
                                    </p>
                                )}
                            </div>
                        );
                    })}
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
