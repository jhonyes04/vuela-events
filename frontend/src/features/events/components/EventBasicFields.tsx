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
import type { Category } from '@/features/categories/lib/categories';
import { CATEGORY_COLOR_STYLES } from '@/features/categories/lib/colors';
import type { Guide } from '@/features/guides/lib/guides';
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
    onCategoryChange: (id: string) => void;
    onGuideChange: (id: string) => void;
    activeCategories: Category[];
    activeGuides: Guide[];
}

// Título, subtítulo, lugar y los selects de categoría/guía: comunes a crear
// y editar, con o sin recurrencia.
export function EventBasicFields({
    fieldId,
    values,
    onChange,
    onCategoryChange,
    onGuideChange,
    activeCategories,
    activeGuides,
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
            <Field id={fieldId('category')} label="Categoría *">
                <Select
                    value={values.categoryId}
                    items={activeCategories.map((c) => ({
                        value: c.id,
                        label: c.name,
                    }))}
                    onValueChange={(value) => onCategoryChange(value ?? '')}
                >
                    <SelectTrigger id={fieldId('category')} className="w-full">
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
                            <SelectItem key={c.id} value={c.id} label={c.name}>
                                <span
                                    className={cn(
                                        'size-3 shrink-0 rounded-full',
                                        CATEGORY_COLOR_STYLES[c.color].swatch,
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
                    onValueChange={(value) => onGuideChange(value ?? '')}
                >
                    <SelectTrigger id={fieldId('guide')} className="w-full">
                        <SelectValue placeholder="Selecciona una guía" />
                    </SelectTrigger>
                    <SelectContent>
                        {activeGuides.map((g) => (
                            <SelectItem key={g.id} value={g.id} label={g.name}>
                                {g.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </Field>
        </>
    );
}
