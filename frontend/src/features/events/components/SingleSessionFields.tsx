import { Field } from '@/features/events/components/EventBasicFields';
import { DateTimePicker } from '@/features/datetime/components/DateTimePicker';
import type { FormValues } from '@/features/events/lib/eventForm';

interface SingleSessionFieldsProps {
    fieldId: (name: string) => string;
    values: FormValues;
    setValues: (update: (v: FormValues) => FormValues) => void;
    // Sin restricción (p. ej. admin) si no se pasa.
    minDate?: Date;
}

// Inicio y fin de un evento suelto (no recurrente).
export function SingleSessionFields({
    fieldId,
    values,
    setValues,
    minDate,
}: SingleSessionFieldsProps) {
    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id={fieldId('starts')} label="Inicio *">
                <DateTimePicker
                    id={fieldId('starts')}
                    value={values.startsAt}
                    minDate={minDate}
                    onChange={(v) =>
                        setValues((val) => ({ ...val, startsAt: v }))
                    }
                />
            </Field>
            <Field id={fieldId('ends')} label="Fin *">
                <DateTimePicker
                    id={fieldId('ends')}
                    value={values.endsAt}
                    minDate={minDate}
                    onChange={(v) =>
                        setValues((val) => ({ ...val, endsAt: v }))
                    }
                />
            </Field>
        </div>
    );
}
