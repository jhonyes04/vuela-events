import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '@/lib/api';
import { listMonthEvents, monthKey, type EventItem } from '@/features/events/lib/events';

interface Result {
    // Mes al que pertenecen los datos ('YYYY-MM').
    month: string;
    events: EventItem[];
    error: string | null;
}

export const useMonthEvents = (year: number, month: number) => {
    const [result, setResult] = useState<Result | null>(null);
    // Al subir la versión se vuelve a pedir el mismo mes, sin vaciar la pantalla.
    const [version, setVersion] = useState(0);

    const current = monthKey(year, month);

    useEffect(() => {
        let cancelled = false;

        listMonthEvents(year, month)
            .then((events) => {
                if (!cancelled) setResult({ month: current, events, error: null });
            })
            .catch((e: unknown) => {
                if (cancelled) return;

                setResult({
                    month: current,
                    events: [],
                    error:
                        e instanceof ApiError
                            ? e.message
                            : 'No se pudieron cargar los eventos',
                });
            });

        return () => {
            cancelled = true;
        };
    }, [year, month, current, version]);

    const reload = useCallback(() => setVersion((v) => v + 1), []);

    // Solo se "carga" al cambiar de mes; una recarga del mismo mes conserva lo que hay.
    const loading = result?.month !== current;

    return {
        events: loading ? [] : result.events,
        error: loading ? null : result.error,
        loading,
        reload,
    };
};
