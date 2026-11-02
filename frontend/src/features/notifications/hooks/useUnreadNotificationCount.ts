import { useCallback, useEffect, useState } from 'react';
import { getUnreadNotificationCount } from '@/features/notifications/lib/notifications';
import { useNotificationStream } from '@/features/notifications/hooks/useNotificationStream';

// Reutilizable donde haga falta el contador (campanita, menú de usuario).
// `enabled`: false mientras no haya sesión (los menús montan sin `user`).
export const useUnreadNotificationCount = (enabled: boolean): number => {
    const [count, setCount] = useState(0);

    const refresh = useCallback(() => {
        if (!enabled) return;

        void getUnreadNotificationCount()
            .then(setCount)
            .catch(() => {});
    }, [enabled]);

    // Mientras enabled es false nadie renderiza este contador (el menú
    // devuelve null sin user), así que no hace falta resetear el estado aquí.
    useEffect(() => {
        if (enabled) refresh();
    }, [enabled, refresh]);

    useNotificationStream(refresh, enabled);

    return count;
};
