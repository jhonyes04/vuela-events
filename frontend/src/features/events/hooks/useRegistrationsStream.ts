import { useEffect } from 'react';
import { config } from '@/config';

// Escucha cambios de inscritos de un evento mientras la ficha está abierta
export const useRegistrationStream = (
    eventId: string,
    onChange: () => void,
) => {
    useEffect(() => {
        const source = new EventSource(
            `${config.apiBase}/events/${eventId}/stream`,
            { withCredentials: true },
        );

        source.onmessage = () => onChange();

        return () => source.close();
    }, [eventId, onChange]);
};
