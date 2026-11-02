import { useEffect, useState } from 'react';
import { ApiError } from '@/lib/api';

// Mismo patrón repetido en varias páginas: carga una vez al montar, no cuando cambia `fetcher`
export const useAsyncList = <T>(
    fetcher: () => Promise<T[]>,
    errorMessage: string,
) => {
    const [items, setItems] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);

        try {
            setItems(await fetcher());
        } catch (e) {
            setError(e instanceof ApiError ? e.message : errorMessage);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void Promise.resolve().then(load);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return { items, setItems, loading, error, setError, load };
};
