import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '@/lib/api';
import { listMonthEvents, monthKey, type EventItem } from '@/lib/events';

interface Result {
    key: string;
    events: EventItem[];
    error: string | null;
}

export const useMonthEvents = (year: number, month: number) => {
    const [result, setResult] = useState<Result | null>(null);
    // Al subir la versión se vuelve a pedir el mismo mes.
    const [version, setVersion] = useState(0);

    const key = `${monthKey(year, month)}#${version}`;

    useEffect(() => {
        let cancelled = false;

        listMonthEvents(year, month)
            .then((events) => {
                if (!cancelled) setResult({ key, events, error: null });
            })
            .catch((e: unknown) => {
                if (cancelled) return;

                setResult({
                    key,
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
    }, [year, month, key]);

    const reload = useCallback(() => setVersion((v) => v + 1), []);

    // Mientras el resultado guardado no sea el de la clave actual, se está cargando.
    const loading = result?.key !== key;

    return {
        events: loading ? [] : result.events,
        error: loading ? null : result.error,
        loading,
        reload,
    };
};
