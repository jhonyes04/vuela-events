import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '@/lib/api';
import type { EventItem } from '@/features/events/lib/events';

interface Result {
    key: string;
    events: EventItem[];
    error: string | null;
}

// Pide eventos para un rango identificado por `cacheKey` (un mes, una
// semana...). Al recargar el mismo rango no vacía la pantalla mientras llega;
// al cambiar de rango sí se muestra "cargando" hasta que llega lo nuevo.
// Solo espera 300ms cuando CAMBIA `cacheKey` (evita ráfagas al paginar
// rápido); un `reload()` del mismo rango (SSE, crear/borrar, reintentar) va
// sin demora. Cancela la petición en vuelo si vuelve a cambiar antes de que
// llegue respuesta.
export const useRangeEvents = (
    cacheKey: string,
    fetchEvents: (signal: AbortSignal) => Promise<EventItem[]>,
) => {
    const [result, setResult] = useState<Result | null>(null);
    const [version, setVersion] = useState(0);
    const prevCacheKey = useRef(cacheKey);

    useEffect(() => {
        const controller = new AbortController();
        const isRangeChange = prevCacheKey.current !== cacheKey;

        prevCacheKey.current = cacheKey;

        const timer = setTimeout(() => {
            fetchEvents(controller.signal)
                .then((events) => {
                    setResult({ key: cacheKey, events, error: null });
                })
                .catch((e: unknown) => {
                    if (e instanceof DOMException && e.name === 'AbortError')
                        return;

                    setResult({
                        key: cacheKey,
                        events: [],
                        error:
                            e instanceof ApiError
                                ? e.message
                                : 'No se pudieron cargar los eventos',
                    });
                });
        }, isRangeChange ? 300 : 0);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
        // fetchEvents se recrea cada render; solo interesa re-pedir al
        // cambiar de rango (cacheKey) o al forzar recarga (version).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cacheKey, version]);

    const reload = useCallback(() => setVersion((v) => v + 1), []);

    // Solo se "carga" al cambiar de rango; una recarga del mismo conserva lo que hay.
    const loading = result?.key !== cacheKey;

    return {
        events: loading ? [] : (result?.events ?? []),
        error: loading ? null : (result?.error ?? null),
        loading,
        reload,
    };
};
