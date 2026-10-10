import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
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
import { Textarea } from '@/components/ui/textarea';
import { EventBasicFields, Field } from '@/features/events/components/EventBasicFields';
import { RecurringEventFields } from '@/features/events/components/RecurringEventFields';
import { SingleSessionFields } from '@/features/events/components/SingleSessionFields';
import { api, ApiError } from '@/lib/api';
import { useProjectsStore } from '@/features/projects/store';
import { useGuidesStore } from '@/features/guides/store';
import {
    createRecurringEvents,
    madridLocalToIso,
    MAX_OCCURRENCES,
    previewRecurrence,
    updateEventById,
    type EventItem,
} from '@/features/events/lib/events';
import {
    EMPTY_FORM_VALUES,
    valuesFromEvent,
    type FormValues,
    type TextField,
} from '@/features/events/lib/eventForm';

interface EventFormBodyProps {
    // null = crear; evento = editar (solo la sesión, sin recurrencia).
    event: EventItem | null;
    initialDate?: string;
    onCreated?: (result: { startsAt: string; count: number }) => void;
    onSaved?: () => void;
    onClose: () => void;
}

// Con su propio estado: se recrea (key) al pasar de crear a editar o entre eventos.
function EventFormBody({
    event,
    initialDate,
    onCreated,
    onSaved,
    onClose,
}: EventFormBodyProps) {
    const isEdit = event !== null;
    const idPrefix = isEdit ? 'edit-ev-' : 'ev-';
    const fieldId = (name: string) => `${idPrefix}${name}`;

    const [values, setValues] = useState<FormValues>(
        event
            ? valuesFromEvent(event)
            : initialDate
              ? { ...EMPTY_FORM_VALUES, startsAt: `${initialDate}T09:00` }
              : EMPTY_FORM_VALUES,
    );
    const [submitting, setSubmitting] = useState(false);
    const projects = useProjectsStore((s) => s.items);
    const guides = useGuidesStore((s) => s.items);
    const loadProjects = useProjectsStore((s) => s.load);
    const loadGuides = useGuidesStore((s) => s.load);

    // Usa la caché si ya se cargaron; solo pide lo que falta.
    useEffect(() => {
        void loadProjects();
        void loadGuides();
    }, [loadProjects, loadGuides]);

    // El proyecto/guía actuales del evento siguen disponibles al editar
    // aunque se hayan desactivado después de crearlo.
    const activeProjects = projects.filter(
        (c) => c.active || c.id === event?.category.id,
    );
    const activeGuides = guides.filter(
        (g) => g.active || g.id === event?.guide.id,
    );

    const set = (name: TextField) => (e: { target: { value: string } }) =>
        setValues((v) => ({ ...v, [name]: e.target.value }));

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

        if (!values.categoryId) {
            toast.error('Selecciona un proyecto');
            return;
        }

        if (!values.guideId) {
            toast.error('Selecciona una guía');
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
                    toast.error(
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

                toast.success('Evento actualizado.');
                onSaved?.();
                onClose();
                return;
            }

            if (values.recurring) {
                if (values.endTime <= values.startTime) {
                    toast.error(
                        'La hora de fin debe ser posterior a la de inicio',
                    );
                    return;
                }

                if (!preview || preview.count === 0 || preview.overLimit) {
                    toast.error(
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
                toast.error(
                    'La fecha de fin debe ser posterior a la de inicio',
                );
                return;
            }

            setSubmitting(true);
            await api.post('/events', { ...common, startsAt, endsAt });

            onCreated?.({ startsAt, count: 1 });
            onClose();
        } catch (err) {
            toast.error(
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
        <DialogContent className="sm:max-w-xl">
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
                <EventBasicFields
                    fieldId={fieldId}
                    values={values}
                    onChange={set}
                    onProjectChange={(categoryId) =>
                        setValues((v) => ({ ...v, categoryId }))
                    }
                    onGuideChange={(guideId) =>
                        setValues((v) => ({ ...v, guideId }))
                    }
                    activeProjects={activeProjects}
                    activeGuides={activeGuides}
                />

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
                    <RecurringEventFields
                        fieldId={fieldId}
                        values={values}
                        setValues={setValues}
                        onChangeText={set}
                        preview={preview}
                        sessionsLabel={sessionsLabel}
                    />
                ) : (
                    <SingleSessionFields
                        fieldId={fieldId}
                        values={values}
                        setValues={setValues}
                    />
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

interface CreateEventOnDayDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    // null = nada que crear (el diálogo no se muestra).
    initialDate: string | null;
    onCreated: (result: { startsAt: string; count: number }) => void;
}

// Mismo formulario que "Crear evento", pero abierto desde un día del
// calendario: precarga el inicio en ese día.
export function CreateEventOnDayDialog({
    open,
    onOpenChange,
    initialDate,
    onCreated,
}: CreateEventOnDayDialogProps) {
    if (!initialDate) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <EventFormBody
                key={initialDate}
                event={null}
                initialDate={initialDate}
                onCreated={onCreated}
                onClose={() => onOpenChange(false)}
            />
        </Dialog>
    );
}
