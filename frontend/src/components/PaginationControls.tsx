import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
} from '@/components/ui/pagination';
import { Button } from '@/components/ui/button';
import { IconTooltip } from '@/components/IconTooltip';
import { PAGE_SIZES, type PageSize } from '@/hooks/usePagination';

const selectClass =
    'h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50';

// Primero, último, la actual y sus vecinas; el resto se resume con "…".
const pageNumbers = (
    page: number,
    pageCount: number,
): (number | 'ellipsis')[] => {
    const pages: (number | 'ellipsis')[] = [1];

    if (page > 3) pages.push('ellipsis');

    for (
        let p = Math.max(2, page - 1);
        p <= Math.min(pageCount - 1, page + 1);
        p++
    ) {
        pages.push(p);
    }

    if (page < pageCount - 2) pages.push('ellipsis');
    if (pageCount > 1) pages.push(pageCount);

    return pages;
};

export function PaginationControls({
    page,
    pageCount,
    pageSize,
    total,
    onPageChange,
    onPageSizeChange,
}: {
    page: number;
    pageCount: number;
    pageSize: PageSize;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: PageSize) => void;
}) {
    const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, total);

    // Los números de página siguen siendo enlaces (#): hay que evitar que naveguen.
    const goTo = (target: number) => (e: { preventDefault(): void }) => {
        e.preventDefault();
        onPageChange(target);
    };

    return (
        <div className="grid grid-cols-3 items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Mostrar</span>
                <select
                    className={selectClass}
                    value={pageSize}
                    onChange={(e) =>
                        onPageSizeChange(Number(e.target.value) as PageSize)
                    }
                >
                    {PAGE_SIZES.map((size) => (
                        <option key={size} value={size}>
                            {size}
                        </option>
                    ))}
                </select>
            </div>

            <p className="justify-self-center text-sm text-muted-foreground">
                Mostrando {from}–{to} de {total}
            </p>

            <div className="justify-self-end">
                <Pagination className="mx-0 w-auto">
                    <PaginationContent>
                        <PaginationItem>
                            <IconTooltip label="Página anterior">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    aria-label="Página anterior"
                                    disabled={page <= 1}
                                    onClick={() => onPageChange(page - 1)}
                                >
                                    <ChevronLeft />
                                </Button>
                            </IconTooltip>
                        </PaginationItem>

                        {pageNumbers(page, pageCount).map((p, i) =>
                            p === 'ellipsis' ? (
                                <PaginationItem key={`e-${i}`}>
                                    <PaginationEllipsis />
                                </PaginationItem>
                            ) : (
                                <PaginationItem key={p}>
                                    <PaginationLink
                                        href="#"
                                        isActive={p === page}
                                        onClick={goTo(p)}
                                    >
                                        {p}
                                    </PaginationLink>
                                </PaginationItem>
                            ),
                        )}

                        <PaginationItem>
                            <IconTooltip label="Página siguiente">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    aria-label="Página siguiente"
                                    disabled={page >= pageCount}
                                    onClick={() => onPageChange(page + 1)}
                                >
                                    <ChevronRight />
                                </Button>
                            </IconTooltip>
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            </div>
        </div>
    );
}
