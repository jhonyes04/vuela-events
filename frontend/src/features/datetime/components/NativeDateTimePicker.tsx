import { Input } from '@/components/ui/input';

// Prueba con <input type="datetime-local"> nativo, en vez del
// DateTimePicker propio. Mismo contrato de props (value en
// 'YYYY-MM-DDTHH:mm') para poder cambiar el import en
// CreateEventDialog.tsx sin tocar nada más.
interface DateTimePickerProps {
    id?: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export const DateTimePicker = ({
    id,
    value,
    onChange,
}: DateTimePickerProps) => (
    <Input
        id={id}
        type="datetime-local"
        step={900}
        value={value}
        onChange={(e) => onChange(e.target.value)}
    />
);
