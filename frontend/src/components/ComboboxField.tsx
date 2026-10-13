import type { ReactNode } from 'react';
import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
    createComboboxItems,
} from '@/components/ui/combobox';
import { InputGroupAddon } from '@/components/ui/input-group';

export interface ComboboxFieldProps<T> {
    id?: string;
    className?: string;
    disabled?: boolean;
    items: readonly T[];
    getValue: (item: T) => string;
    getLabel: (item: T) => string;
    // Punto de color, icono, etc. delante del nombre. Si se omite, no se
    // muestra nada: así un mismo combobox sirve con o sin indicador.
    getIndicator?: (item: T) => ReactNode;
    value: string;
    onValueChange: (value: string) => void;
    placeholder?: string;
    emptyMessage?: string;
    // false en listas fijas (pocas opciones, sin buscador): solo abre/cierra.
    searchable?: boolean;
}

export const ComboboxField = <T,>({
    id,
    className,
    disabled,
    items,
    getValue,
    getLabel,
    getIndicator,
    value,
    onValueChange,
    placeholder,
    emptyMessage = 'Sin resultados',
    searchable = true,
}: ComboboxFieldProps<T>) => {
    const comboboxItems = createComboboxItems(items as never, {
        getValue,
        getLabel,
    });

    const selected = items.find((item) => getValue(item) === value);

    return (
        <Combobox
            items={comboboxItems}
            value={value}
            onValueChange={(next) => onValueChange(next ?? '')}
        >
            <ComboboxInput
                id={id}
                className={className}
                disabled={disabled}
                readOnly={!searchable}
                placeholder={placeholder}
            >
                {selected && getIndicator && (
                    <InputGroupAddon align="inline-start">
                        {getIndicator(selected)}
                    </InputGroupAddon>
                )}
            </ComboboxInput>
            <ComboboxContent>
                <ComboboxEmpty>{emptyMessage}</ComboboxEmpty>
                <ComboboxList>
                    {(item: T) => (
                        <ComboboxItem
                            key={getValue(item)}
                            value={getValue(item)}
                        >
                            {getIndicator?.(item)}
                            {getLabel(item)}
                        </ComboboxItem>
                    )}
                </ComboboxList>
            </ComboboxContent>
        </Combobox>
    );
};
