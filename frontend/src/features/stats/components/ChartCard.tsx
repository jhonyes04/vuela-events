import type { ReactNode } from 'react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ChartCardProps {
    title: string;
    description?: string;
    empty: boolean;
    className?: string;
    children: ReactNode;
}

// Tarjeta común para cada gráfica o lista: sin borde pesado, con sombra suave.
export const ChartCard = ({
    title,
    description,
    empty,
    className,
    children,
}: ChartCardProps) => (
    <Card
        className={cn(
            'gap-0 overflow-hidden border-0 py-0 shadow-sm ring-1 ring-foreground/5',
            className,
        )}
    >
        <CardHeader className="gap-1 px-6 pt-6">
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            {description && (
                <CardDescription className="text-sm">
                    {description}
                </CardDescription>
            )}
        </CardHeader>
        <CardContent className="px-6 pt-4 pb-6">
            {empty ? (
                <div className="grid place-items-center py-10 text-sm text-muted-foreground">
                    Sin datos todavía.
                </div>
            ) : (
                children
            )}
        </CardContent>
    </Card>
);
