import { useState } from 'react';
import { es } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
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

interface DateTimePickerProps {
    id?: string;
    // 'YYYY-MM-DDTHH:mm'
    value: string;
    onChange: (value: string) => void;
}

export const DateTimePicker = ({
    id,
    value,
    onChange,
}: DateTimePickerProps) => {
    const [open, setOpen] = useState(false);
    const datePart = value.split('T')[0] ?? '';
    const selected = datePart ? parseDateKey(datePart) : undefined;

    const time = value.split('T')[1] ?? '00:00';

    const pickDate = (date: Date | undefined) => {
        if (!date) return;

        onChange(`${formatDateKey(date)}T${time}`);
    };

    const pickTime = (nextTime: string) => {
        onChange(`${datePart || formatDateKey(new Date())}T${nextTime}`);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <InputGroup className="bg-card">
                <InputGroupInput
                    id={id}
                    type="datetime-local"
                    step={900}
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
                <div className="border-t p-3">
                    <Input
                        type="time"
                        step={900}
                        value={time}
                        onChange={(e) => pickTime(e.target.value)}
                    />
                </div>
            </PopoverContent>
        </Popover>
    );
};
