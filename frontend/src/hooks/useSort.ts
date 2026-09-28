import { useState } from 'react';

export type SortDirection = 'asc' | 'desc';

export interface Sort<K extends string> {
    key: K;
    dir: SortDirection;
}

// Reutilizable en cualquier tabla: define un comparador por columna y listo.
export function useSort<T, K extends string>(
    items: T[],
    comparators: Record<K, (a: T, b: T) => number>,
    initial: Sort<K>,
) {
    const [sort, setSort] = useState<Sort<K>>(initial);

    const toggleSort = (key: K) => {
        setSort((prev) =>
            prev.key === key
                ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
                : { key, dir: 'asc' },
        );
    };

    const dir = sort.dir === 'asc' ? 1 : -1;
    const sorted = [...items].sort(
        (a, b) => comparators[sort.key](a, b) * dir,
    );

    return { sorted, sort, toggleSort };
}
