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
export const OwnerFilterField = ({
    options,
    value,
    onValueChange,
}: OwnerFilterFieldProps) => {
    const maxChars = Math.max(...options.map((owner) => personLabel(owner).length));

    return (
        <div
            className="w-full sm:w-auto"
            style={{ minWidth: `calc(${maxChars}ch + 2.5rem)` }}
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
