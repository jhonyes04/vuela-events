import { useState } from 'react';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const dateLabelFormat = new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
});

// 'YYYY-MM-DD' -> Date local (evita el desfase de parsear como UTC).
const parseDateKey = (key: string): Date | undefined => {
    const [year, month, day] = key.split('-').map(Number);

    if (!year || !month || !day) return undefined;

    return new Date(year, month - 1, day);
};

// Date local -> 'YYYY-MM-DD'
const formatDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
};

interface DatePickerProps {
    id?: string;
    // 'YYYY-MM-DD'
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export const DatePicker = ({
    id,
    value,
    onChange,
    placeholder = 'Selecciona una fecha',
}: DatePickerProps) => {
    const [open, setOpen] = useState(false);
    const selected = value ? parseDateKey(value) : undefined;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
                render={
                    <Button
                        id={id}
                        type="button"
                        variant="outline"
                        className={cn(
                            'w-full justify-start font-normal',
                            !selected && 'text-muted-foreground',
                        )}
                    >
                        <CalendarIcon className="size-4" />
                        {selected
                            ? dateLabelFormat.format(selected)
                            : placeholder}
                    </Button>
                }
            />
            <PopoverContent className="w-auto p-0">
                <Calendar
                    mode="single"
                    selected={selected}
                    onSelect={(date) => {
                        if (!date) return;

                        onChange(formatDateKey(date));
                        setOpen(false);
                    }}
                />
            </PopoverContent>
        </Popover>
    );
};
