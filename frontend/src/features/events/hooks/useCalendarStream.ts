import { useEffect } from 'react';
import { config } from '@/config';

// Escucha altas/bajas/ediciones de CUALQUIER evento, para refrescar el calendario.
export const useCalendarStream = (onChange: () => void) => {
    useEffect(() => {
        const source = new EventSource(`${config.apiBase}/events/stream`, {
            withCredentials: true,
        });

        source.onmessage = () => onChange();

        return () => source.close();
    }, [onChange]);
};
