import { useEffect, useState } from 'react';
import { listAttendees, type Attendee } from '@/features/events/lib/events';

interface Result {
    key: string;
    attendees: Attendee[];
    failed: boolean;
}

// Carga los inscritos de un evento. `refreshKey` cambia cuando alguien se inscribe
// o cancela: se vuelve a pedir la lista sin vaciar la pantalla.
export const useAttendees = (eventId: string, refreshKey: string) => {
    const [result, setResult] = useState<Result | null>(null);

    const key = `${eventId}|${refreshKey}`;

    useEffect(() => {
        let cancelled = false;

        listAttendees(eventId)
            .then((attendees) => {
                if (!cancelled) setResult({ key, attendees, failed: false });
            })
            .catch(() => {
                if (!cancelled) setResult({ key, attendees: [], failed: true });
            });

        return () => {
            cancelled = true;
        };
    }, [eventId, key]);

    // Se "carga" solo la primera vez para este evento.
    const loading = result === null || !result.key.startsWith(`${eventId}|`);

    return {
        attendees: loading ? [] : result.attendees,
        failed: loading ? false : result.failed,
        loading,
    };
};
