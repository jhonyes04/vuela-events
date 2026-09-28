import { ChevronDown, ChevronUp } from 'lucide-react';
import type { Sort } from '@/hooks/useSort';

export function SortableHeader<K extends string>({
    label,
    sortKey,
    sort,
    onSort,
}: {
    label: string;
    sortKey: K;
    sort: Sort<K>;
    onSort: (key: K) => void;
}) {
    const active = sort.key === sortKey;

    return (
        <th
            className="p-3 font-medium"
            aria-sort={
                active
                    ? sort.dir === 'asc'
                        ? 'ascending'
                        : 'descending'
                    : 'none'
            }
        >
            <button
                type="button"
                onClick={() => onSort(sortKey)}
                className="flex items-center gap-1 hover:text-foreground"
            >
                {label}
                {active &&
                    (sort.dir === 'asc' ? (
                        <ChevronUp className="size-3.5" />
                    ) : (
                        <ChevronDown className="size-3.5" />
                    ))}
            </button>
        </th>
    );
}
