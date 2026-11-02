import { api } from '@/lib/api';

export type NotificationType =
    | 'registration_created'
    | 'registration_cancelled'
    | 'event_updated'
    | 'event_cancelled'
    | 'event_reminder'
    | 'new_event_in_project'
    | 'new_project'
    | 'new_user_registered'
    | 'role_changed'
    | 'maintenance_notice'
    | 'broadcast';

export interface AppNotification {
    id: string;
    type: NotificationType;
    title: string;
    body: string | null;
    eventId: string | null;
    readAt: string | null;
    createdAt: string;
}

export const listNotifications = (): Promise<AppNotification[]> =>
    api
        .get<{ notifications: AppNotification[] }>('/notifications')
        .then((res) => res.notifications);

export const getUnreadNotificationCount = (): Promise<number> =>
    api
        .get<{ count: number }>('/notifications/unread-count')
        .then((res) => res.count);

export const markNotificationRead = (id: string): Promise<void> =>
    api.patch(`/notifications/${id}/read`);

export const markAllNotificationsRead = (): Promise<void> =>
    api.patch('/notifications/read-all');

export const markNotificationUnread = (id: string): Promise<void> =>
    api.patch(`/notifications/${id}/unread`);

export const markAllNotificationsUnread = (): Promise<void> =>
    api.patch('/notifications/unread-all');

export const deleteNotifications = (ids: string[]): Promise<void> =>
    api.delete('/notifications', { ids });

export const sendBroadcastNotification = (
    title: string,
    body: string,
): Promise<number> =>
    api
        .post<{ count: number }>('/notifications/broadcast', { title, body })
        .then((res) => res.count);
