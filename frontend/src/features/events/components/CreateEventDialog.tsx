import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { CircleAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { api, ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
    listCategories,
    type Category,
} from '@/features/categories/lib/categories';
import { CATEGORY_COLOR_STYLES } from '@/features/categories/lib/colors';
import {
    createRecurringEvents,
    formatFullDate,
    madridLocalToIso,
    MAX_OCCURRENCES,
    previewRecurrence,
    WEEKDAYS,
} from '@/features/events/lib/events';

interface FormValues {
    title: string;
    subtitle: string;
    location: string;
    description: string;
    capacity: string;
    categoryId: string;
    // Evento suelto
    startsAt: string;
    endsAt: string;
    // Serie recurrente
    recurring: boolean;
    from: string;
    to: string;
    weekdays: number[];
    startTime: string;
    endTime: string;
}

type TextField = Exclude<keyof FormValues, 'recurring' | 'weekdays'>;

const EMPTY: FormValues = {
    title: '',
    subtitle: '',
    location: '',
    description: '',
    capacity: '',
    categoryId: '',
    startsAt: '',
    endsAt: '',
    recurring: false,
    from: '',
    to: '',
    weekdays: [],
    startTime: '',
    endTime: '',
};

function Field({
    id,
    label,
    children,
}: {
    id: string;
    label: string;
    children: ReactNode;
}) {
    return (
        <div className="grid gap-1.5">
            <Label htmlFor={id}>{label}</Label>
            {children}
        </div>
    );
}

// onCreated recibe el inicio de la primera sesión creada y cuántas se crearon.
export function CreateEventDialog({
    onCreated,
}: {
    onCreated: (result: { startsAt: string; count: number }) => void;
}) {
    const [open, setOpen] = useState(false);
    const [values, setValues] = useState<FormValues>(EMPTY);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);

    useEffect(() => {
        void listCategories().then(setCategories);
    }, []);

    const activeCategories = categories.filter((c) => c.active);

    const set = (name: TextField) => (e: { target: { value: string } }) =>
        setValues((v) => ({ ...v, [name]: e.target.value }));

    const toggleWeekday = (day: number) =>
        setValues((v) => ({
            ...v,
            weekdays: v.weekdays.includes(day)
                ? v.weekdays.filter((d) => d !== day)
                : [...v.weekdays, day],
        }));

    const handleOpenChange = (next: boolean) => {
        setOpen(next);

        if (next) {
            setValues(EMPTY);
            setError(null);
        }
    };

    const preview = values.recurring
        ? previewRecurrence(values.from, values.to, values.weekdays)
        : null;

    const sessionsLabel = preview
        ? preview.count === 1
            ? '1 sesión'
            : `${preview.count} sesiones`
        : '';

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!values.categoryId) {
            setError('Selecciona una categoría');
            return;
        }

        const common = {
            title: values.title,
            // Los opcionales vacíos no se envían.
            subtitle: values.subtitle || undefined,
            location: values.location,
            description: values.description || undefined,
            capacity: values.capacity ? Number(values.capacity) : undefined,
            categoryId: values.categoryId,
        };

        try {
            if (values.recurring) {
                if (values.endTime <= values.startTime) {
                    setError(
                        'La hora de fin debe ser posterior a la de inicio',
                    );
                    return;
                }

                if (!preview || preview.count === 0 || preview.overLimit) {
                    setError(
                        preview?.overLimit
                            ? `Una serie no puede superar las ${MAX_OCCURRENCES} sesiones`
                            : 'Ninguna fecha del rango coincide con los días elegidos',
                    );
                    return;
                }

                setSubmitting(true);

                const created = await createRecurringEvents({
                    ...common,
                    from: values.from,
                    to: values.to,
                    weekdays: [...values.weekdays].sort((a, b) => a - b),
                    startTime: values.startTime,
                    endTime: values.endTime,
                });

                setOpen(false);
                onCreated({
                    startsAt: created.firstStartsAt,
                    count: created.count,
                });
                return;
            }

            const startsAt = madridLocalToIso(values.startsAt);
            const endsAt = madridLocalToIso(values.endsAt);

            if (new Date(endsAt) <= new Date(startsAt)) {
                setError('La fecha de fin debe ser posterior a la de inicio');
                return;
            }

            setSubmitting(true);
            await api.post('/events', { ...common, startsAt, endsAt });

            setOpen(false);
            onCreated({ startsAt, count: 1 });
        } catch (err) {
            setError(
                err instanceof ApiError
                    ? err.message
                    : 'No se pudo crear el evento',
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <Button onClick={() => handleOpenChange(true)}>Crear evento</Button>

            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Crear evento</DialogTitle>
                        <DialogDescription>
                            Las horas son de Madrid. Los campos con * son
                            obligatorios.
                        </DialogDescription>
                    </DialogHeader>

                    <form
                        id="create-event-form"
                        onSubmit={(e) => void handleSubmit(e)}
                        className="grid gap-4"
                    >
                        <Field id="ev-title" label="Título *">
                            <Input
                                id="ev-title"
                                required
                                maxLength={120}
                                value={values.title}
                                onChange={set('title')}
                            />
                        </Field>
                        <Field id="ev-subtitle" label="Subtítulo">
                            <Input
                                id="ev-subtitle"
                                maxLength={200}
                                value={values.subtitle}
                                onChange={set('subtitle')}
                            />
                        </Field>
                        <Field id="ev-location" label="Lugar *">
                            <Input
                                id="ev-location"
                                required
                                maxLength={200}
                                value={values.location}
                                onChange={set('location')}
                            />
                        </Field>
                        <Field id="ev-category" label="Categoría *">
                            <Select
                                value={values.categoryId}
                                onValueChange={(value) =>
                                    setValues((v) => ({
                                        ...v,
                                        categoryId: value ?? '',
                                    }))
                                }
                            >
                                <SelectTrigger
                                    id="ev-category"
                                    className="w-full"
                                >
                                    <SelectValue placeholder="Selecciona una categoría" />
                                </SelectTrigger>
                                <SelectContent>
                                    {activeCategories.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>
                                            <span
                                                className={cn(
                                                    'size-3 shrink-0 rounded-full',
                                                    CATEGORY_COLOR_STYLES[
                                                        c.color
                                                    ].swatch,
                                                )}
                                            />
                                            {c.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>

                        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                            <input
                                type="checkbox"
                                className="size-4 accent-primary"
                                checked={values.recurring}
                                onChange={(e) =>
                                    setValues((v) => ({
                                        ...v,
                                        recurring: e.target.checked,
                                    }))
                                }
                            />
                            Repetir cada semana
                        </label>

                        {values.recurring ? (
                            <>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <Field id="ev-from" label="Desde *">
                                        <Input
                                            id="ev-from"
                                            type="date"
                                            required
                                            value={values.from}
                                            onChange={set('from')}
                                        />
                                    </Field>
                                    <Field id="ev-to" label="Hasta *">
                                        <Input
                                            id="ev-to"
                                            type="date"
                                            required
                                            value={values.to}
                                            onChange={set('to')}
                                        />
                                    </Field>
                                </div>

                                <fieldset className="grid gap-1.5">
                                    <legend className="mb-1.5 text-sm font-medium">
                                        Días de la semana *
                                    </legend>
                                    <div className="flex flex-wrap gap-2">
                                        {WEEKDAYS.map((day) => (
                                            <label
                                                key={day.value}
                                                className="cursor-pointer"
                                            >
                                                <input
                                                    type="checkbox"
                                                    className="peer sr-only"
                                                    aria-label={day.label}
                                                    checked={values.weekdays.includes(
                                                        day.value,
                                                    )}
                                                    onChange={() =>
                                                        toggleWeekday(day.value)
                                                    }
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
                                    <Field
                                        id="ev-start-time"
                                        label="Hora de inicio *"
                                    >
                                        <Input
                                            id="ev-start-time"
                                            type="time"
                                            required
                                            value={values.startTime}
                                            onChange={set('startTime')}
                                        />
                                    </Field>
                                    <Field
                                        id="ev-end-time"
                                        label="Hora de fin *"
                                    >
                                        <Input
                                            id="ev-end-time"
                                            type="time"
                                            required
                                            value={values.endTime}
                                            onChange={set('endTime')}
                                        />
                                    </Field>
                                </div>

                                <p
                                    role="status"
                                    className="rounded-lg bg-muted px-3 py-2 text-sm"
                                >
                                    {!preview
                                        ? 'Elige fechas y días para ver cuántas sesiones se crearán.'
                                        : preview.overLimit
                                          ? `Una serie no puede superar las ${MAX_OCCURRENCES} sesiones ni abarcar más de dos años.`
                                          : preview.count === 0
                                            ? 'Ningún día del rango coincide con los días elegidos.'
                                            : `Se crearán ${sessionsLabel}, del ${formatFullDate(preview.first!)} al ${formatFullDate(preview.last!)}.`}
                                </p>
                            </>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field id="ev-starts" label="Inicio *">
                                    <Input
                                        id="ev-starts"
                                        type="datetime-local"
                                        required
                                        value={values.startsAt}
                                        onChange={set('startsAt')}
                                    />
                                </Field>
                                <Field id="ev-ends" label="Fin *">
                                    <Input
                                        id="ev-ends"
                                        type="datetime-local"
                                        required
                                        value={values.endsAt}
                                        onChange={set('endsAt')}
                                    />
                                </Field>
                            </div>
                        )}

                        <Field
                            id="ev-capacity"
                            label={
                                values.recurring
                                    ? 'Aforo de cada sesión (opcional)'
                                    : 'Aforo (opcional)'
                            }
                        >
                            <Input
                                id="ev-capacity"
                                type="number"
                                min={1}
                                max={100000}
                                step={1}
                                value={values.capacity}
                                onChange={set('capacity')}
                            />
                        </Field>
                        <Field id="ev-description" label="Descripción">
                            <Textarea
                                id="ev-description"
                                maxLength={2000}
                                value={values.description}
                                onChange={set('description')}
                            />
                        </Field>

                        {error && (
                            <Alert variant="destructive">
                                <CircleAlert />
                                <AlertTitle>
                                    No se pudo crear el evento
                                </AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                    </form>

                    <DialogFooter>
                        <Button
                            type="submit"
                            form="create-event-form"
                            disabled={submitting}
                        >
                            {submitting
                                ? 'Creando…'
                                : values.recurring &&
                                    preview &&
                                    preview.count > 0 &&
                                    !preview.overLimit
                                  ? `Crear ${sessionsLabel}`
                                  : 'Crear evento'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
