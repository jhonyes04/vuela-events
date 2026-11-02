import { ComboboxField } from '@/components/ComboboxField';
import { personLabel } from '@/lib/personLabel';

interface OwnerFilterOption {
    id: string;
    name: string;
    puntoVuela: string | null;
}

interface OwnerFilterFieldProps {
    options: OwnerFilterOption[];
    value: string;
    onValueChange: (value: string) => void;
}

// Ancho = al label más largo: el desplegable hereda el ancho del combobox
// cerrado, así que un ancho fijo partía los nombres largos en dos líneas.
// Ese ancho mínimo solo se aplica desde sm: en móvil el combobox se adapta
// al ancho de pantalla (w-full) en vez de desbordar.
export const OwnerFilterField = ({
    options,
    value,
    onValueChange,
}: OwnerFilterFieldProps) => {
    const maxChars = Math.max(
        ...options.map((owner) => personLabel(owner).length),
    );

    return (
        <div
            className="w-full sm:w-auto sm:min-w-[var(--owner-filter-min-w)]"
            style={
                {
                    '--owner-filter-min-w': `calc(${maxChars}ch - 7rem)`,
                } as React.CSSProperties
            }
        >
            <ComboboxField
                className="w-full bg-card"
                items={options}
                getValue={(owner) => owner.id}
                getLabel={(owner) => personLabel(owner)}
                value={value}
                onValueChange={onValueChange}
                placeholder="Todos los propietarios"
            />
        </div>
    );
};
