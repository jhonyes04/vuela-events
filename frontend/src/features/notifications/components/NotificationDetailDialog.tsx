import {
    AlarmClock,
    Bell,
    CalendarClock,
    CalendarPlus,
    CalendarX,
    FolderPlus,
    Megaphone,
    ShieldCheck,
    UserCheck,
    UserMinus,
    UserPlus,
    Wrench,
    type LucideIcon,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import type {
    AppNotification,
    NotificationType,
} from '@/features/notifications/lib/notifications';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

export const NOTIFICATION_TYPE_ICONS: Record<NotificationType, LucideIcon> = {
    registration_created: UserPlus,
    registration_cancelled: UserMinus,
    event_updated: CalendarClock,
    event_cancelled: CalendarX,
    new_event_in_project: CalendarPlus,
    new_project: FolderPlus,
    new_user_registered: UserCheck,
    role_changed: ShieldCheck,
    maintenance_notice: Wrench,
    event_reminder: AlarmClock,
    broadcast: Megaphone,
};

interface NotificationDetailBodyProps {
    notification: AppNotification;
    onClose: () => void;
}

// Contenido con su propia key: se recrea al cambiar de notificación.
const NotificationDetailBody = ({
    notification,
    onClose,
}: NotificationDetailBodyProps) => {
    const Icon = NOTIFICATION_TYPE_ICONS[notification.type] ?? Bell;

    return (
        <Dialog
            open
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <DialogContent className="sm:max-w-md">
                <DialogHeader className="flex-row items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-yellow/30 text-brand-ink">
                        <Icon className="size-5" />
                    </span>
                    <div className="grid gap-0.5 text-left">
                        <DialogTitle>{notification.title}</DialogTitle>
                        <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(
                                new Date(notification.createdAt),
                                { locale: es, addSuffix: true },
                            )}
                        </span>
                    </div>
                </DialogHeader>

                {notification.body && (
                    <p className="rounded-xl bg-muted/60 p-3 text-sm whitespace-pre-line">
                        {notification.body}
                    </p>
                )}
            </DialogContent>
        </Dialog>
    );
};

interface NotificationDetailDialogProps {
    notification: AppNotification | null;
    onClose: () => void;
}

export const NotificationDetailDialog = ({
    notification,
    onClose,
}: NotificationDetailDialogProps) => {
    if (!notification) return null;

    return (
        <NotificationDetailBody
            key={notification.id}
            notification={notification}
            onClose={onClose}
        />
    );
};
