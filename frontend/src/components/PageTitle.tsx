import type { ReactNode } from 'react';
import { cn } from 'cn';

interface PageTitleProps {
    children: ReactNode;
    className?: string;
}

// Título de página con una pequeña barra de acento y una entrada suave.
export const PageTitle = ({ children, className }: PageTitleProps) => (
    <div
        className={cn(
            'mb-6 animate-in fade-in slide-in-from-left-2 duration-500',
            className,
        )}
    >
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {children}
        </h1>
        <span className="mt-1 block h-1 w-12 rounded-full bg-brand-yellow" />
    </div>
);
