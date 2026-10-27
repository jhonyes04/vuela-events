import type { ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ComboboxField } from '@/components/ComboboxField';
import { cn } from '@/lib/utils';
import type { Project } from '@/features/projects/lib/projects';
import { getProjectColorSwatch } from '@/features/projects/lib/colors';
import type { FormValues, TextField } from '@/features/events/lib/eventForm';

export function Field({
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

interface EventBasicFieldsProps {
    fieldId: (name: string) => string;
    values: FormValues;
    onChange: (name: TextField) => (e: { target: { value: string } }) => void;
    onProjectChange: (id: string) => void;
    onGuideChange: (id: string) => void;
    activeProjects: Project[];
}

// Título, subtítulo, lugar y el select de proyecto: comunes a crear
// y editar, con o sin recurrencia.
export function EventBasicFields({
    fieldId,
    values,
    onChange,
    onProjectChange,
    onGuideChange,
    activeProjects,
}: EventBasicFieldsProps) {
    const selectedProject = activeProjects.find(
        (project) => project.id === values.projectId,
    );
    const guides = selectedProject?.guides ?? [];
    // Si solo hay una, se preselecciona aunque el evento no tuviera guía
    // guardada todavía (eventos creados antes de esta función).
    const guideValue =
        values.guideId || (guides.length === 1 ? guides[0]!.id : '');

    return (
        <>
            <Field id={fieldId('title')} label="Título *">
                <Input
                    id={fieldId('title')}
                    required
                    maxLength={120}
                    value={values.title}
                    onChange={onChange('title')}
                />
            </Field>
            <Field id={fieldId('subtitle')} label="Subtítulo">
                <Input
                    id={fieldId('subtitle')}
                    maxLength={200}
                    value={values.subtitle}
                    onChange={onChange('subtitle')}
                />
            </Field>
            <Field id={fieldId('location')} label="Lugar *">
                <Input
                    id={fieldId('location')}
                    required
                    maxLength={200}
                    value={values.location}
                    onChange={onChange('location')}
                />
            </Field>
            <Field id={fieldId('category')} label="Proyecto *">
                <ComboboxField
                    id={fieldId('category')}
                    className="w-full"
                    items={activeProjects}
                    getValue={(c) => c.id}
                    getLabel={(c) => c.name}
                    getIndicator={(c) => {
                        const swatch = getProjectColorSwatch(c.color);

                        return (
                            <span
                                className={cn(
                                    'size-3 shrink-0 rounded-full',
                                    swatch.className,
                                )}
                                style={swatch.style}
                            />
                        );
                    }}
                    value={values.projectId}
                    onValueChange={onProjectChange}
                    placeholder="Selecciona un proyecto"
                    emptyMessage="No hay proyectos"
                />
            </Field>
            <Field id={fieldId('guide')} label="Guía *">
                <ComboboxField
                    id={fieldId('guide')}
                    className="w-full"
                    items={guides}
                    getValue={(guide) => guide.id}
                    getLabel={(guide) => guide.name}
                    value={guideValue}
                    onValueChange={onGuideChange}
                    placeholder="Selecciona una guía"
                    emptyMessage="No hay guías"
                />
            </Field>
        </>
    );
}
