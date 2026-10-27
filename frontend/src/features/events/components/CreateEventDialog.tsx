import { useEffect, useState, type SubmitEvent } from 'react';
import { readFileAsBase64 } from '@/features/resources/lib/documents';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/features/auth/hooks/context';
import {
    EventBasicFields,
    Field,
} from '@/features/events/components/EventBasicFields';
import { EventMaterialsField } from '@/features/events/components/EventMaterialsField';
import { EventAttachmentsField } from '@/features/events/components/EventAttachmentsField';
import { RecurringEventFields } from '@/features/events/components/RecurringEventFields';
import { SingleSessionFields } from '@/features/events/components/SingleSessionFields';
import { api, ApiError } from '@/lib/api';
import { useProjectsStore } from '@/features/projects/store';
import { useMaterialsStore } from '@/features/materials/store';
import {
    createRecurringEvents,
    dayKey,
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
    const { user } = useAuth();
    const canBackdate = user?.permissions.includes('events:backdate') ?? false;
    const minDate = canBackdate ? undefined : new Date();

    const [values, setValues] = useState<FormValues>(
        event
            ? valuesFromEvent(event)
            : initialDate
              ? {
                    ...EMPTY_FORM_VALUES,
                    startsAt: `${initialDate}T09:00`,
                    endsAt: `${initialDate}T10:00`,
                }
              : EMPTY_FORM_VALUES,
    );
    const [submitting, setSubmitting] = useState(false);
    const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
    const [keptAttachments, setKeptAttachments] = useState(
        event?.attachments ?? [],
    );

    const projects = useProjectsStore((s) => s.items);
    const loadProjects = useProjectsStore((s) => s.load);
    const materials = useMaterialsStore((s) => s.items);
    const loadMaterials = useMaterialsStore((s) => s.load);

    // Usa la caché si ya se cargaron; solo pide lo que falta.
    useEffect(() => {
        void loadProjects();
    }, [loadProjects]);

    useEffect(() => {
        void loadMaterials();
    }, [loadMaterials]);

    // Los materiales ya elegidos siguen disponibles aunque se hayan
    // desactivado después de asignarlos.
    const activeMaterials = materials.filter(
        (material) =>
            material.active || values.materialIds.includes(material.id),
    );

    const hasFullEventsAccess =
        (user?.permissions.includes('events:edit') ?? false) ||
        (user?.permissions.includes('events:delete') ?? false);
    // El proyecto actual del evento sigue disponible al editar aunque se
    // haya desactivado después de crearlo.
    const activeProjects = projects.filter(
        (c) =>
            (c.active || c.id === event?.project.id) &&
            (hasFullEventsAccess || c.createdById === user?.id),
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

    const handleSubmit = async (e: SubmitEvent) => {
        e.preventDefault();

        if (!values.projectId) {
            toast.error('Selecciona un proyecto');
            return;
        }

        const selectedProject = activeProjects.find(
            (project) => project.id === values.projectId,
        );
        const projectGuides = selectedProject?.guides ?? [];
        const guideId =
            projectGuides.length === 1 ? projectGuides[0]!.id : values.guideId;

        if (projectGuides.length > 1 && !guideId) {
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
            projectId: values.projectId,
            guideId,
            materialIds: values.materialIds,
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

                const todayKey = dayKey(new Date().toISOString());
                const newDay = dayKey(startsAt);
                const originalDay = dayKey(event.startsAt);

                if (
                    !canBackdate &&
                    newDay < todayKey &&
                    newDay !== originalDay
                ) {
                    toast.error('No se pueden crear eventos en días pasados');
                    return;
                }

                const newAttachments = await Promise.all(
                    attachmentFiles.map(async (file) => {
                        const { contentType, dataBase64 } =
                            await readFileAsBase64(file);
                        return { fileName: file.name, contentType, dataBase64 };
                    }),
                );
                const keptIds = new Set(keptAttachments.map((a) => a.id));
                const removedAttachmentIds = event.attachments
                    .filter((a) => !keptIds.has(a.id))
                    .map((a) => a.id);

                setSubmitting(true);
                await updateEventById(event.id, {
                    ...common,
                    startsAt,
                    endsAt,
                    attachments: newAttachments,
                    removedAttachmentIds,
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

                const todayKey = dayKey(new Date().toISOString());

                if (!canBackdate && values.from < todayKey) {
                    toast.error('No se pueden crear eventos en días pasados');
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

            if (
                !canBackdate &&
                dayKey(startsAt) < dayKey(new Date().toISOString())
            ) {
                toast.error('No se pueden crear eventos en días pasados');
                return;
            }

            const attachments = await Promise.all(
                attachmentFiles.map(async (file) => {
                    const { contentType, dataBase64 } =
                        await readFileAsBase64(file);
                    return { fileName: file.name, contentType, dataBase64 };
                }),
            );

            setSubmitting(true);
            await api.post('/events', {
                ...common,
                startsAt,
                endsAt,
                attachments,
            });

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
                    onProjectChange={(projectId) => {
                        const project = activeProjects.find(
                            (p) => p.id === projectId,
                        );
                        const guides = project?.guides ?? [];

                        setValues((value) => ({
                            ...value,
                            projectId,
                            guideId: guides.length === 1 ? guides[0]!.id : '',
                        }));
                    }}
                    onGuideChange={(guideId) =>
                        setValues((value) => ({ ...value, guideId }))
                    }
                    activeProjects={activeProjects}
                />

                {!isEdit && (
                    <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                        <Checkbox
                            checked={values.recurring}
                            onCheckedChange={(checked) =>
                                setValues((v) => ({
                                    ...v,
                                    recurring: checked,
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
                        minDate={minDate}
                    />
                ) : (
                    <SingleSessionFields
                        fieldId={fieldId}
                        values={values}
                        setValues={setValues}
                        minDate={minDate}
                    />
                )}

                <EventMaterialsField
                    fieldId={fieldId}
                    activeMaterials={activeMaterials}
                    materialIds={values.materialIds}
                    onChange={(ids) =>
                        setValues((v) => ({ ...v, materialIds: ids }))
                    }
                />

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
                <Field
                    id={fieldId('description')}
                    label="Descripción (opcional)"
                >
                    <Textarea
                        id={fieldId('description')}
                        maxLength={2000}
                        value={values.description}
                        onChange={set('description')}
                    />
                </Field>

                {!values.recurring && (
                    <EventAttachmentsField
                        fieldId={fieldId}
                        keptAttachments={keptAttachments}
                        setKeptAttachments={setKeptAttachments}
                        attachmentFiles={attachmentFiles}
                        setAttachmentFiles={setAttachmentFiles}
                    />
                )}
            </form>

            <DialogFooter>
                <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={submitting}
                >
                    Cancelar
                </Button>
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
    const [formKey, setFormKey] = useState(0);

    return (
        <>
            <Button
                onClick={() => {
                    setFormKey((k) => k + 1);
                    setOpen(true);
                }}
            >
                Crear evento
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                {open && (
                    <EventFormBody
                        key={formKey}
                        event={null}
                        onCreated={onCreated}
                        onClose={() => setOpen(false)}
                    />
                )}
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
