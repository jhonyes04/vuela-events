import { ColorPicker } from '@/components/ColorPicker';
import { cn } from '@/lib/utils';
import {
    PROJECT_COLORS,
    PROJECT_COLOR_STYLES,
    isCustomProjectColor,
} from '@/features/projects/lib/colors';

interface ProjectColorFieldProps {
    color: string;
    onChange: (color: string) => void;
}

export const ProjectColorField = ({ color, onChange }: ProjectColorFieldProps) => (
    <fieldset className="grid gap-1.5">
        <legend className="mb-1.5 text-sm font-medium">Color</legend>
        <div className="flex flex-wrap items-center border rounded-xl p-3 gap-2">
            {PROJECT_COLORS.map((c) => (
                <button
                    key={c}
                    type="button"
                    aria-label={PROJECT_COLOR_STYLES[c].label}
                    aria-pressed={color === c}
                    onClick={() => onChange(c)}
                    className={cn(
                        'cursor-pointer size-8 rounded-full ring-offset-2 ring-offset-background',
                        PROJECT_COLOR_STYLES[c].swatch,
                        color === c
                            ? 'ring-2 ring-ring'
                            : 'hover:ring-2 hover:ring-border',
                    )}
                />
            ))}
            <ColorPicker
                aria-label="Color personalizado"
                value={isCustomProjectColor(color) ? color : '#999999'}
                onChange={onChange}
                className={cn(
                    'rounded-lg ring-offset-2 ring-offset-background',
                    isCustomProjectColor(color)
                        ? 'ring-2 ring-ring'
                        : 'hover:ring-2 hover:ring-border',
                )}
            />
        </div>
    </fieldset>
);
