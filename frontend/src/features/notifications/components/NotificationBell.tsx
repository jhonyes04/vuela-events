import { useEffect } from 'react';
import { Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { NavLink } from 'react-router';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { NOTIFICATION_TYPE_ICONS } from '@/features/notifications/components/NotificationDetailDialog';
import {
    type AppNotification,
    markAllNotificationsRead,
    markNotificationRead,
} from '@/features/notifications/lib/notifications';
import { useNotificationsStore } from '@/features/notifications/store';

export const NotificationBell = () => {
    const notifications = useNotificationsStore((s) => s.unread);
    const unreadCount = useNotificationsStore((s) => s.unreadCount);
    const ensureStream = useNotificationsStore((s) => s.ensureStream);
    const markLocalRead = useNotificationsStore((s) => s.markLocalRead);
    const markAllLocalRead = useNotificationsStore((s) => s.markAllLocalRead);

    useEffect(() => {
        ensureStream();
    }, [ensureStream]);

    // Leída = desaparece de la lista al momento, sin esperar la respuesta.
    const handleRead = (notification: AppNotification) => {
        markLocalRead(notification.id);

        void markNotificationRead(notification.id);
    };

    const handleReadAll = () => {
        markAllLocalRead();

        void markAllNotificationsRead();
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <Button
                        type="button"
                        variant="default"
                        className="relative rounded-full"
                        size="icon"
                        aria-label="Notificaciones"
                    >
                        <Bell className="size-5" />
                        {unreadCount > 0 && (
                            <Badge
                                variant="default"
                                className="absolute -top-1 -right-1 h-5 min-w-5 justify-center bg-red-600 px-1"
                            >
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </Badge>
                        )}
                    </Button>
                }
            />
            <DropdownMenuContent align="end" className="w-80">
                <div className="flex items-center justify-between px-2 py-1.5">
                    <span className="text-sm font-medium">Notificaciones</span>
                    {unreadCount > 0 && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            onClick={handleReadAll}
                        >
                            Marcar todas como leídas
                        </Button>
                    )}
                </div>

                <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 && (
                        <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                            Sin notificaciones
                        </p>
                    )}

                    {notifications.map((notification) => {
                        const Icon =
                            NOTIFICATION_TYPE_ICONS[notification.type] ??
                            Bell;

                        return (
                            <DropdownMenuItem
                                key={notification.id}
                                closeOnClick={false}
                                className="my-1 flex-col items-start gap-2 border cursor-pointer whitespace-normal"
                                onClick={() => handleRead(notification)}
                            >
                                <div className="flex w-full items-center gap-3">
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
                                    <p className="w-full rounded-xl bg-muted/60 p-2 text-xs whitespace-pre-line">
                                        {notification.body}
                                    </p>
                                )}
                            </DropdownMenuItem>
                        );
                    })}
                </div>
                <DropdownMenuItem
                    closeOnClick={true}
                    className="cursor-pointer justify-center text-sm font-medium"
                    render={
                        <NavLink to="/notificaciones">
                            Ver todas las notificaciones
                        </NavLink>
                    }
                />
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
