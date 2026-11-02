import { useEffect } from 'react';
import { config } from '@/config';

// Avisa cuando hay notificaciones nuevas para refrescar la campanita.
// `enabled`: para componentes que montan sin sesión (los menús de usuario,
// a diferencia de la campanita, que ya está gateada por `user` en Header).
export const useNotificationStream = (
    onChange: () => void,
    enabled = true,
) => {
    useEffect(() => {
        if (!enabled) return;

        const source = new EventSource(
            `${config.apiBase}/notifications/stream`,
            { withCredentials: true },
        );

        source.onmessage = () => onChange();

        return () => source.close();
    }, [onChange, enabled]);
};
