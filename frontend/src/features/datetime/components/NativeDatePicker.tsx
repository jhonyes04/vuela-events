import { Input } from '@/components/ui/input';

// Prueba con <input type="date"> nativo, en vez del DatePicker propio.
// Mismo contrato de props (value en 'YYYY-MM-DD') para poder cambiar el
// import en CreateEventDialog.tsx sin tocar nada más.
interface DatePickerProps {
    id?: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export const DatePicker = ({ id, value, onChange }: DatePickerProps) => (
    <Input
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
    />
);
