import type { ReactNode } from 'react';
import { Progress } from '@/components/ui/progress';

export interface RankRow {
    id: string;
    title: string;
    meta: string;
    value?: string;
    progress?: number;
    leading?: string;
    action?: ReactNode;
}

// Lista limpia: avatar opcional, título, detalle y una píldora con el valor.
export const RankList = ({ rows }: { rows: RankRow[] }) => (
    <ul className="grid divide-y">
        {rows.map((r) => (
            <li
                key={r.id}
                className="grid gap-2 py-3 sm:grid-cols-[1fr_auto] sm:items-center"
            >
                <div className="flex min-w-0 items-center gap-3">
                    {r.leading && (
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-yellow text-sm font-semibold text-brand-ink">
                            {r.leading}
                        </span>
                    )}
                    <div className="min-w-0">
                        <p className="truncate font-medium">{r.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                            {r.meta}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {r.progress !== undefined && (
                        <Progress value={r.progress} className="w-24 sm:w-32" />
                    )}
                    {r.value !== undefined && (
                        <span className="rounded-full bg-muted px-2.5 py-0.5 text-sm font-semibold tabular-nums">
                            {r.value}
                        </span>
                    )}
                    {r.action}
                </div>
            </li>
        ))}
    </ul>
);
