import { CalendarIcon } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
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

// 'YYYY-MM-DDTHH:mm' -> Date local (solo la parte de fecha; evita el desfase de UTC).
const parseDatePart = (value: string): Date | undefined => {
    const [year, month, day] = (value.split('T')[0] ?? '')
        .split('-')
        .map(Number);

    if (!year || !month || !day) return undefined;

    return new Date(year, month - 1, day);
};

// Date local -> 'YYYY-MM-DD'
const formatDatePart = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
};

interface DateTimePickerProps {
    id?: string;
    // 'YYYY-MM-DDTHH:mm'
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export const DateTimePicker = ({
    id,
    value,
    onChange,
    placeholder = 'Selecciona fecha y hora',
}: DateTimePickerProps) => {
    const [open, setOpen] = useState(false);
    const selectedDate = value ? parseDatePart(value) : undefined;
    const time = value.split('T')[1] ?? '';

    const setDate = (date: Date | undefined) => {
        if (!date) return;

        onChange(`${formatDatePart(date)}T${time || '00:00'}`);
        setOpen(false);
    };

    const setTime = (nextTime: string) => {
        const datePart = value.split('T')[0] || formatDatePart(new Date());

        onChange(`${datePart}T${nextTime}`);
    };

    return (
        <div className="flex min-w-0 gap-2">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger
                    render={
                        <Button
                            id={id}
                            type="button"
                            variant="outline"
                            className={cn(
                                'min-w-0 flex-1 justify-start font-normal',
                                !selectedDate && 'text-muted-foreground',
                            )}
                        >
                            <CalendarIcon className="size-4 shrink-0" />
                            <span className="truncate">
                                {selectedDate
                                    ? dateLabelFormat.format(selectedDate)
                                    : placeholder}
                            </span>
                        </Button>
                    }
                />
                <PopoverContent className="w-auto p-0">
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setDate}
                    />
                </PopoverContent>
            </Popover>
            <Input
                type="time"
                required
                className="w-28 shrink-0"
                value={time}
                onChange={(e) => setTime(e.target.value)}
            />
        </div>
    );
};
