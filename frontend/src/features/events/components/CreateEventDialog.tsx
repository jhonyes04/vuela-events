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
import { DatePicker } from '@/features/datetime/components/DatePicker';
import { DateTimePicker } from '@/features/datetime/components/DateTimePicker';
import { api, ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
    listCategories,
    type Category,
} from '@/features/categories/lib/categories';
import { listGuides, type Guide } from '@/features/guides/lib/guides';
import { CATEGORY_COLOR_STYLES } from '@/features/categories/lib/colors';
import {
    createRecurringEvents,
    formatFullDate,
    isoToMadridLocal,
    madridLocalToIso,
    MAX_OCCURRENCES,
    previewRecurrence,
    updateEventById,
    WEEKDAYS,
    type EventItem,
} from '@/features/events/lib/events';

interface FormValues {
    title: string;
    subtitle: string;
    location: string;
    description: string;
    capacity: string;
    categoryId: string;
    guideId: string;
    // Evento suelto
    startsAt: string;
    endsAt: string;
    // Serie recurrente (solo al crear; al editar no se usa)
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
    guideId: '',
    startsAt: '',
    endsAt: '',
    recurring: false,
    from: '',
    to: '',
    weekdays: [],
    startTime: '',
    endTime: '',
};

const valuesFromEvent = (event: EventItem): FormValues => ({
    title: event.title,
    subtitle: event.subtitle ?? '',
    location: event.location ?? '',
    description: event.description ?? '',
    capacity: event.capacity ? String(event.capacity) : '',
    categoryId: event.category.id,
    guideId: event.guide.id,
    startsAt: isoToMadridLocal(event.startsAt),
    endsAt: isoToMadridLocal(event.endsAt),
    recurring: false,
    from: '',
    to: '',
    weekdays: [],
    startTime: '',
    endTime: '',
});

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

interface EventFormBodyProps {
    // null = crear; evento = editar (solo la sesión, sin recurrencia).
    event: EventItem | null;
    onCreated?: (result: { startsAt: string; count: number }) => void;
    onSaved?: () => void;
    onClose: () => void;
}

// Con su propio estado: se recrea (key) al pasar de crear a editar o entre eventos.
function EventFormBody({
    event,
    onCreated,
    onSaved,
    onClose,
}: EventFormBodyProps) {
    const isEdit = event !== null;
    const idPrefix = isEdit ? 'edit-ev-' : 'ev-';
    const fieldId = (name: string) => `${idPrefix}${name}`;

    const [values, setValues] = useState<FormValues>(
        event ? valuesFromEvent(event) : EMPTY,
    );
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [guides, setGuides] = useState<Guide[]>([]);

    useEffect(() => {
        void listCategories().then(setCategories);
        void listGuides().then(setGuides);
    }, []);

    // La categoría/guía actuales del evento siguen disponibles al editar
    // aunque se hayan desactivado después de crearlo.
    const activeCategories = categories.filter(
        (c) => c.active || c.id === event?.category.id,
    );
    const activeGuides = guides.filter(
        (g) => g.active || g.id === event?.guide.id,
    );

    const set = (name: TextField) => (e: { target: { value: string } }) =>
        setValues((v) => ({ ...v, [name]: e.target.value }));

    const toggleWeekday = (day: number) =>
        setValues((v) => ({
            ...v,
            weekdays: v.weekdays.includes(day)
                ? v.weekdays.filter((d) => d !== day)
                : [...v.weekdays, day],
        }));

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

        if (!values.guideId) {
            setError('Selecciona una guía');
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
            guideId: values.guideId,
        };

        try {
            if (event) {
                const startsAt = madridLocalToIso(values.startsAt);
                const endsAt = madridLocalToIso(values.endsAt);

                if (new Date(endsAt) <= new Date(startsAt)) {
                    setError(
                        'La fecha de fin debe ser posterior a la de inicio',
                    );
                    return;
                }

                setSubmitting(true);
                await updateEventById(event.id, {
                    ...common,
                    startsAt,
                    endsAt,
                });

                onSaved?.();
                onClose();
                return;
            }

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

                onCreated?.({
                    startsAt: created.firstStartsAt,
                    count: created.count,
                });
                onClose();
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

            onCreated?.({ startsAt, count: 1 });
            onClose();
        } catch (err) {
            setError(
                err instanceof ApiError
                    ? err.message
                    : isEdit
                      ? 'No se pudo guardar el evento'
                      : 'No se pudo crear el evento',
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <DialogContent className="sm:max-w-lg">
            <DialogHeader>
                <DialogTitle>
                    {isEdit ? 'Editar evento' : 'Crear evento'}
                </DialogTitle>
                <DialogDescription>
                    Las horas son de Madrid. Los campos con * son obligatorios.
                </DialogDescription>
            </DialogHeader>

            <form
                id={fieldId('form')}
                onSubmit={(e) => void handleSubmit(e)}
                className="grid gap-4"
            >
                <Field id={fieldId('title')} label="Título *">
                    <Input
                        id={fieldId('title')}
                        required
                        maxLength={120}
                        value={values.title}
                        onChange={set('title')}
                    />
                </Field>
                <Field id={fieldId('subtitle')} label="Subtítulo">
                    <Input
                        id={fieldId('subtitle')}
                        maxLength={200}
                        value={values.subtitle}
                        onChange={set('subtitle')}
                    />
                </Field>
                <Field id={fieldId('location')} label="Lugar *">
                    <Input
                        id={fieldId('location')}
                        required
                        maxLength={200}
                        value={values.location}
                        onChange={set('location')}
                    />
                </Field>
                <Field id={fieldId('category')} label="Categoría *">
                    <Select
                        value={values.categoryId}
                        items={activeCategories.map((c) => ({
                            value: c.id,
                            label: c.name,
                        }))}
                        onValueChange={(value) =>
                            setValues((v) => ({
                                ...v,
                                categoryId: value ?? '',
                            }))
                        }
                    >
                        <SelectTrigger
                            id={fieldId('category')}
                            className="w-full"
                        >
                            <SelectValue placeholder="Selecciona una categoría">
                                {(value: string | null) => {
                                    const selected = activeCategories.find(
                                        (c) => c.id === value,
                                    );

                                    if (!selected) return null;

                                    return (
                                        <>
                                            <span
                                                className={cn(
                                                    'size-3 shrink-0 rounded-full',
                                                    CATEGORY_COLOR_STYLES[
                                                        selected.color
                                                    ].swatch,
                                                )}
                                            />
                                            {selected.name}
                                        </>
                                    );
                                }}
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            {activeCategories.map((c) => (
                                <SelectItem
                                    key={c.id}
                                    value={c.id}
                                    label={c.name}
                                >
                                    <span
                                        className={cn(
                                            'size-3 shrink-0 rounded-full',
                                            CATEGORY_COLOR_STYLES[c.color]
                                                .swatch,
                                        )}
                                    />
                                    {c.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </Field>

                <Field id={fieldId('guide')} label="Guía *">
                    <Select
                        value={values.guideId}
                        items={activeGuides.map((g) => ({
                            value: g.id,
                            label: g.name,
                        }))}
                        onValueChange={(value) =>
                            setValues((v) => ({
                                ...v,
                                guideId: value ?? '',
                            }))
                        }
                    >
                        <SelectTrigger id={fieldId('guide')} className="w-full">
                            <SelectValue placeholder="Selecciona una guía" />
                        </SelectTrigger>
                        <SelectContent>
                            {activeGuides.map((g) => (
                                <SelectItem
                                    key={g.id}
                                    value={g.id}
                                    label={g.name}
                                >
                                    {g.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </Field>

                {!isEdit && (
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
                )}

                {values.recurring ? (
                    <>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field id={fieldId('from')} label="Desde *">
                                <DatePicker
                                    id={fieldId('from')}
                                    value={values.from}
                                    onChange={(v) =>
                                        setValues((val) => ({
                                            ...val,
                                            from: v,
                                        }))
                                    }
                                />
                            </Field>
                            <Field id={fieldId('to')} label="Hasta *">
                                <DatePicker
                                    id={fieldId('to')}
                                    value={values.to}
                                    onChange={(v) =>
                                        setValues((val) => ({
                                            ...val,
                                            to: v,
                                        }))
                                    }
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
                                id={fieldId('start-time')}
                                label="Hora de inicio *"
                            >
                                <Input
                                    id={fieldId('start-time')}
                                    type="time"
                                    required
                                    value={values.startTime}
                                    onChange={set('startTime')}
                                />
                            </Field>
                            <Field
                                id={fieldId('end-time')}
                                label="Hora de fin *"
                            >
                                <Input
                                    id={fieldId('end-time')}
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
                        <Field id={fieldId('starts')} label="Inicio *">
                            <DateTimePicker
                                id={fieldId('starts')}
                                value={values.startsAt}
                                onChange={(v) =>
                                    setValues((val) => ({
                                        ...val,
                                        startsAt: v,
                                    }))
                                }
                            />
                        </Field>
                        <Field id={fieldId('ends')} label="Fin *">
                            <DateTimePicker
                                id={fieldId('ends')}
                                value={values.endsAt}
                                onChange={(v) =>
                                    setValues((val) => ({
                                        ...val,
                                        endsAt: v,
                                    }))
                                }
                            />
                        </Field>
                    </div>
                )}

                <Field
                    id={fieldId('capacity')}
                    label={
                        values.recurring
                            ? 'Aforo de cada sesión (opcional)'
                            : 'Aforo (opcional)'
                    }
                >
                    <Input
                        id={fieldId('capacity')}
                        type="number"
                        min={1}
                        max={100000}
                        step={1}
                        value={values.capacity}
                        onChange={set('capacity')}
                    />
                </Field>
                <Field id={fieldId('description')} label="Descripción">
                    <Textarea
                        id={fieldId('description')}
                        maxLength={2000}
                        value={values.description}
                        onChange={set('description')}
                    />
                </Field>

                {error && (
                    <Alert variant="destructive">
                        <CircleAlert />
                        <AlertTitle>
                            {isEdit
                                ? 'No se pudo guardar'
                                : 'No se pudo crear el evento'}
                        </AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
            </form>

            <DialogFooter>
                <Button
                    type="submit"
                    form={fieldId('form')}
                    disabled={submitting}
                >
                    {isEdit
                        ? submitting
                            ? 'Guardando…'
                            : 'Guardar'
                        : submitting
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
    );
}

// onCreated recibe el inicio de la primera sesión creada y cuántas se crearon.
export function CreateEventDialog({
    onCreated,
}: {
    onCreated: (result: { startsAt: string; count: number }) => void;
}) {
    const [open, setOpen] = useState(false);

    return (
        <>
            <Button onClick={() => setOpen(true)}>Crear evento</Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <EventFormBody
                    key="new"
                    event={null}
                    onCreated={onCreated}
                    onClose={() => setOpen(false)}
                />
            </Dialog>
        </>
    );
}

interface EventEditDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    // null = nada que editar (el diálogo no se muestra).
    event: EventItem | null;
    onSaved: () => void;
}

// Usado desde la gestión de eventos: mismo formulario que crear, sin
// recurrencia, precargado con los datos del evento.
export function EventEditDialog({
    open,
    onOpenChange,
    event,
    onSaved,
}: EventEditDialogProps) {
    if (!event) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <EventFormBody
                key={event.id}
                event={event}
                onSaved={onSaved}
                onClose={() => onOpenChange(false)}
            />
        </Dialog>
    );
}
