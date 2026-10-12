import type { ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { Project } from '@/features/projects/lib/projects';
import { PROJECT_COLOR_STYLES } from '@/features/projects/lib/colors';
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
    activeProjects: Project[];
}

// Título, subtítulo, lugar y el select de proyecto: comunes a crear
// y editar, con o sin recurrencia.
export function EventBasicFields({
    fieldId,
    values,
    onChange,
    onProjectChange,
    activeProjects,
}: EventBasicFieldsProps) {
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
                <Select
                    value={values.projectId}
                    items={activeProjects.map((c) => ({
                        value: c.id,
                        label: c.name,
                    }))}
                    onValueChange={(value) => onProjectChange(value ?? '')}
                >
                    <SelectTrigger id={fieldId('category')} className="w-full">
                        <SelectValue placeholder="Selecciona un proyecto">
                            {(value: string | null) => {
                                const selected = activeProjects.find(
                                    (c) => c.id === value,
                                );

                                if (!selected) return null;

                                return (
                                    <>
                                        <span
                                            className={cn(
                                                'size-3 shrink-0 rounded-full',
                                                PROJECT_COLOR_STYLES[
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
                        {activeProjects.map((c) => (
                            <SelectItem key={c.id} value={c.id} label={c.name}>
                                <span
                                    className={cn(
                                        'size-3 shrink-0 rounded-full',
                                        PROJECT_COLOR_STYLES[c.color].swatch,
                                    )}
                                />
                                {c.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </Field>
        </>
    );
}
