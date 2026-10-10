import type { ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import type { Sort } from '@/hooks/useSort';
import { cn } from '@/lib/utils';

export interface DataTableColumn<T, K extends string = string> {
    key: string;
    header: ReactNode;
    sortKey?: K;
    align?: 'left' | 'right';
    headerClassName?: string;
    cellClassName?: string;
    render: (row: T) => ReactNode;
}

interface DataTableProps<T, K extends string> {
    columns: DataTableColumn<T, K>[];
    rows: T[];
    rowKey: (row: T) => string;
    sort?: Sort<K>;
    onSort?: (key: K) => void;
    rowClassName?: (row: T) => string;
}

// Grid genérico: cabecera ordenable por columna + filas. Búsqueda, filtros
// y paginación quedan afuera, los maneja cada página como hoy.
export const DataTable = <T, K extends string>({
    columns,
    rows,
    rowKey,
    sort,
    onSort,
    rowClassName,
}: DataTableProps<T, K>) => (
    <Table>
        <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
                {columns.map((col) => (
                    <TableHead
                        key={col.key}
                        className={cn(
                            'p-3 font-bold',
                            col.align === 'right' && 'text-right',
                            col.headerClassName,
                        )}
                        aria-sort={
                            col.sortKey && sort?.key === col.sortKey
                                ? sort.dir === 'asc'
                                    ? 'ascending'
                                    : 'descending'
                                : undefined
                        }
                    >
                        {col.sortKey ? (
                            <button
                                type="button"
                                onClick={() => onSort?.(col.sortKey!)}
                                className="flex items-center gap-1 hover:text-foreground"
                            >
                                {col.header}
                                {sort?.key === col.sortKey &&
                                    (sort.dir === 'asc' ? (
                                        <ChevronUp className="size-3.5" />
                                    ) : (
                                        <ChevronDown className="size-3.5" />
                                    ))}
                            </button>
                        ) : (
                            col.header
                        )}
                    </TableHead>
                ))}
            </TableRow>
        </TableHeader>
        <TableBody>
            {rows.map((row) => (
                <TableRow key={rowKey(row)} className={rowClassName?.(row)}>
                    {columns.map((col) => (
                        <TableCell
                            key={col.key}
                            className={cn(
                                'p-3 whitespace-normal',
                                col.align === 'right' && 'text-right',
                                col.cellClassName,
                            )}
                        >
                            {col.render(row)}
                        </TableCell>
                    ))}
                </TableRow>
            ))}
        </TableBody>
    </Table>
);
