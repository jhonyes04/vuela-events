import type { ReactElement } from 'react';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface IconTooltipProps {
    label: string;
    // El botón de solo icono, ya con su propio aria-label.
    children: ReactElement;
}

export const IconTooltip = ({ label, children }: IconTooltipProps) => (
    <Tooltip>
        <TooltipTrigger render={children} />
        <TooltipContent>{label}</TooltipContent>
    </Tooltip>
);
