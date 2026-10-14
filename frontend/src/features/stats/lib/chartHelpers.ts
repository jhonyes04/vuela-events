import type { ChartConfig } from '@/components/ui/chart';

export const countConfig = (label: string, color: string): ChartConfig => ({
    count: { label, color },
});

export const valueConfig = (label: string, color: string): ChartConfig => ({
    value: { label, color },
});

export const initials = (name: string): string =>
    name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase();

export const percentOf = (part: number, total: number): number =>
    total === 0 ? 0 : Math.round((part / total) * 100);
