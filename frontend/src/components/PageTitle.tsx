import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from 'cn';

interface PageTitleProps {
    children: ReactNode;
    icon?: LucideIcon;
    className?: string;
}

// Título de página con un subrayado que se dibuja de izquierda a derecha.
export const PageTitle = ({ children, icon: Icon, className }: PageTitleProps) => (
    <div className={cn('mb-6 inline-block', className)}>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            {Icon && <Icon className="size-6 shrink-0 sm:size-7" />}
            {children}
        </h1>
        <span
            className="mt-1 block h-1 w-full rounded-full bg-brand-yellow [animation:draw-underline_0.6s_ease-out_0.15s_both] [clip-path:inset(0_100%_0_0)]"
        />
    </div>
);
