import { useState } from 'react';
import { es } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupInput,
} from '@/components/ui/input-group';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { formatDateKey, parseDateKey } from '@/features/datetime/lib/dateMask';

interface DatePickerProps {
    id?: string;
    // 'YYYY-MM-DD'
    value: string;
    onChange: (value: string) => void;
}

export const DatePicker = ({ id, value, onChange }: DatePickerProps) => {
    const [open, setOpen] = useState(false);
    const selected = value ? parseDateKey(value) : undefined;

    const pickDate = (date: Date | undefined) => {
        if (!date) return;

        onChange(formatDateKey(date));
        setOpen(false);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <InputGroup className="bg-card">
                <InputGroupInput
                    id={id}
                    type="date"
                    className="[&::-webkit-calendar-picker-indicator]:hidden"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                />
                <InputGroupAddon align="inline-end">
                    <PopoverTrigger
                        render={
                            <InputGroupButton
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                aria-label="Abrir calendario"
                            >
                                <CalendarIcon />
                            </InputGroupButton>
                        }
                    />
                </InputGroupAddon>
            </InputGroup>
            <PopoverContent
                className="w-auto overflow-hidden p-0"
                align="end"
                alignOffset={-8}
                sideOffset={10}
            >
                <Calendar
                    mode="single"
                    selected={selected}
                    onSelect={pickDate}
                    locale={es}
                    weekStartsOn={1}
                />
            </PopoverContent>
        </Popover>
    );
};
