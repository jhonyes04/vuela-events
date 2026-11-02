import { useEffect } from 'react';
import { useNotificationsStore } from '@/features/notifications/store';

// Reutilizable donde haga falta el contador (campanita, menú de usuario).
// `enabled`: false mientras no haya sesión (los menús montan sin `user`).
export const useUnreadNotificationCount = (enabled: boolean): number => {
    const unreadCount = useNotificationsStore((s) => s.unreadCount);
    const ensureStream = useNotificationsStore((s) => s.ensureStream);

    useEffect(() => {
        if (enabled) ensureStream();
    }, [enabled, ensureStream]);

    return enabled ? unreadCount : 0;
};
