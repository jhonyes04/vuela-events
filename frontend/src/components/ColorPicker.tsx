import { useEffect, useId, useRef } from 'react';
import Coloris from '@melloware/coloris';
import '@melloware/coloris/dist/coloris.css';
import { cn } from 'cn';
import { IconTooltip } from './IconTooltip';

let colorisInitialized = false;

const ensureColorisInit = () => {
    if (colorisInitialized) return;
    colorisInitialized = true;

    Coloris.init();
    Coloris({
        el: '.vuela-color-picker',
        // Sin wrapper de Coloris: pintamos el círculo nosotros (abajo) para
        // que quede igual que el resto de swatches de la paleta.
        wrap: false,
        theme: 'polaroid',
        themeMode: 'dark',
        format: 'hex',
        alpha: false,
        clearButton: false,
    });
};

export interface ColorPickerProps {
    id?: string;
    className?: string;
    value: string;
    onChange: (hex: string) => void;
    disabled?: boolean;
    'aria-label'?: string;
}

export const ColorPicker = ({
    id,
    className,
    value,
    onChange,
    disabled,
    'aria-label': ariaLabel,
}: ColorPickerProps) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const autoId = useId();

    useEffect(() => {
        ensureColorisInit();
    }, []);

    useEffect(() => {
        const input = inputRef.current;
        if (input && input.value !== value) {
            input.value = value;
        }
    }, [value]);

    return (
        <IconTooltip label="Color personalizado">
            <span
                className={cn(
                    'relative inline-block size-8 rounded-full',
                    className,
                )}
                style={{ backgroundColor: value }}
            >
                <input
                    ref={inputRef}
                    id={id ?? autoId}
                    type="text"
                    readOnly
                    disabled={disabled}
                    aria-label={ariaLabel}
                    defaultValue={value}
                    onInput={(event) => onChange(event.currentTarget.value)}
                    className="vuela-color-picker absolute inset-0 size-full cursor-pointer rounded-full border-0 bg-transparent p-0 opacity-0 disabled:cursor-not-allowed"
                />
            </span>
        </IconTooltip>
    );
};
