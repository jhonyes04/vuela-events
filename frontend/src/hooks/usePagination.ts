import { useMemo, useState } from 'react';

export const PAGE_SIZES = [10, 25, 50, 75, 100] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

// Reutilizable en cualquier listado: pagina un array ya cargado en memoria.
export function usePagination<T>(items: T[], initialPageSize: PageSize = 25) {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSizeState] = useState<PageSize>(initialPageSize);

    const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
    const page_ = Math.min(page, pageCount);

    const paged = useMemo(
        () => items.slice((page_ - 1) * pageSize, page_ * pageSize),
        [items, page_, pageSize],
    );

    const setPageSize = (size: PageSize) => {
        setPageSizeState(size);
        setPage(1);
    };

    return {
        paged,
        page: page_,
        pageCount,
        pageSize,
        total: items.length,
        setPage,
        setPageSize,
    };
}
