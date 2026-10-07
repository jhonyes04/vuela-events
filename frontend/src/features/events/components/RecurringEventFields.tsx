import { Field } from '@/features/events/components/EventBasicFields';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/features/datetime/components/DatePicker';
import {
    formatFullDate,
    MAX_OCCURRENCES,
    WEEKDAYS,
    type RecurrencePreview,
} from '@/features/events/lib/events';
import type { FormValues } from '@/features/events/lib/eventForm';

interface RecurringEventFieldsProps {
    fieldId: (name: string) => string;
    values: FormValues;
    setValues: (update: (v: FormValues) => FormValues) => void;
    onChangeText: (
        name: 'startTime' | 'endTime',
    ) => (e: { target: { value: string } }) => void;
    preview: RecurrencePreview | null;
    sessionsLabel: string;
}

// Rango de fechas, días de la semana y horas de una serie recurrente, más el
// resumen de cuántas sesiones se van a crear.
export function RecurringEventFields({
    fieldId,
    values,
    setValues,
    onChangeText,
    preview,
    sessionsLabel,
}: RecurringEventFieldsProps) {
    const toggleWeekday = (day: number) =>
        setValues((v) => ({
            ...v,
            weekdays: v.weekdays.includes(day)
                ? v.weekdays.filter((d) => d !== day)
                : [...v.weekdays, day],
        }));

    return (
        <>
            <div className="grid gap-4 sm:grid-cols-2">
                <Field id={fieldId('from')} label="Desde *">
                    <DatePicker
                        id={fieldId('from')}
                        value={values.from}
                        onChange={(v) =>
                            setValues((val) => ({ ...val, from: v }))
                        }
                    />
                </Field>
                <Field id={fieldId('to')} label="Hasta *">
                    <DatePicker
                        id={fieldId('to')}
                        value={values.to}
                        onChange={(v) => setValues((val) => ({ ...val, to: v }))}
                    />
                </Field>
            </div>

            <fieldset className="grid gap-1.5">
                <legend className="mb-1.5 text-sm font-medium">
                    Días de la semana *
                </legend>
                <div className="flex flex-wrap gap-2">
                    {WEEKDAYS.map((day) => (
                        <label key={day.value} className="cursor-pointer">
                            <input
                                type="checkbox"
                                className="peer sr-only"
                                aria-label={day.label}
                                checked={values.weekdays.includes(day.value)}
                                onChange={() => toggleWeekday(day.value)}
                            />
                            <span
                                aria-hidden="true"
                                className="flex size-9 items-center justify-center rounded-lg border border-input text-sm font-medium peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:border-ring peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50"
                            >
                                {day.short}
                            </span>
                        </label>
                    ))}
                </div>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
                <Field id={fieldId('start-time')} label="Hora de inicio *">
                    <Input
                        id={fieldId('start-time')}
                        type="time"
                        required
                        value={values.startTime}
                        onChange={onChangeText('startTime')}
                    />
                </Field>
                <Field id={fieldId('end-time')} label="Hora de fin *">
                    <Input
                        id={fieldId('end-time')}
                        type="time"
                        required
                        value={values.endTime}
                        onChange={onChangeText('endTime')}
                    />
                </Field>
            </div>

            <p role="status" className="rounded-lg bg-muted px-3 py-2 text-sm">
                {!preview
                    ? 'Elige fechas y días para ver cuántas sesiones se crearán.'
                    : preview.overLimit
                      ? `Una serie no puede superar las ${MAX_OCCURRENCES} sesiones ni abarcar más de dos años.`
                      : preview.count === 0
                        ? 'Ningún día del rango coincide con los días elegidos.'
                        : `Se crearán ${sessionsLabel}, del ${formatFullDate(preview.first!)} al ${formatFullDate(preview.last!)}.`}
            </p>
        </>
    );
}
