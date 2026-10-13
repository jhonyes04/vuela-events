import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { RichTextEditor } from '@/components/RichTextEditor';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Combobox,
    ComboboxChip,
    ComboboxChips,
    ComboboxChipsInput,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxItem,
    ComboboxList,
    ComboboxValue,
    useComboboxAnchor,
} from '@/components/ui/combobox';
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
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
    createProject,
    updateProject,
    type Project,
} from '@/features/projects/lib/projects';
import {
    PROJECT_COLORS,
    PROJECT_COLOR_STYLES,
    type ProjectColor,
} from '@/features/projects/lib/colors';
import { useGuidesStore } from '@/features/guides/store';

const EMPTY_EDITOR_HTML = '<p></p>';

interface ProjectFormBodyProps {
    project: Project | null;
    onSaved: (project: Project) => void;
    onClose: () => void;
}

// Con su propio estado: el padre la remonta (key) cada vez que abre el diálogo.
const ProjectFormBody = ({
    project,
    onSaved,
    onClose,
}: ProjectFormBodyProps) => {
    const chipsAnchor = useComboboxAnchor();
    const [name, setName] = useState(project?.name ?? '');
    const [description, setDescription] = useState(project?.description ?? '');
    const [color, setColor] = useState<ProjectColor>(
        project?.color ?? PROJECT_COLORS[0],
    );
    const [guideIds, setGuideIds] = useState<Set<string>>(
        new Set(project?.guides.map((guide) => guide.id) ?? []),
    );
    const [active, setActive] = useState(project?.active ?? true);
    const [submitting, setSubmitting] = useState(false);

    const guides = useGuidesStore((s) => s.items);
    const loadGuides = useGuidesStore((s) => s.load);

    useEffect(() => {
        void loadGuides();
    }, [loadGuides]);

    // La guía actual del proyecto sigue disponible aunque se haya
    // desactivado después de asignarla.
    const activeGuides = guides.filter(
        (guide) => guide.active || guideIds.has(guide.id),
    );

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (guideIds.size === 0) {
            toast.error('Selecciona al menos una guía');
            return;
        }

        setSubmitting(true);

        try {
            const payload = {
                name,
                description:
                    description === EMPTY_EDITOR_HTML ? null : description,
                color,
                guideIds: [...guideIds],
            };

            const saved = project
                ? await updateProject(project.id, { ...payload, active })
                : await createProject(payload);

            toast.success(
                project ? 'Proyecto actualizado.' : 'Proyecto creado.',
            );
            onSaved(saved);
            onClose();
        } catch (err) {
            toast.error(
                err instanceof ApiError
                    ? err.message
                    : 'No se pudo guardar el proyecto',
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
                <DialogTitle>
                    {project ? 'Editar proyecto' : 'Nuevo proyecto'}
                </DialogTitle>
                <DialogDescription>
                    El color se usa para diferenciarlo en el calendario.
                </DialogDescription>
            </DialogHeader>

            <form
                id="project-form"
                onSubmit={(e) => void handleSubmit(e)}
                className="grid gap-4"
            >
                <div className="grid gap-1.5">
                    <Label htmlFor="project-name">Nombre *</Label>
                    <Input
                        id="project-name"
                        required
                        minLength={2}
                        maxLength={80}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>

                <div className="grid gap-1.5">
                    <Label htmlFor="project-guides">Guías *</Label>
                    <Combobox
                        items={activeGuides.map((guide) => ({
                            value: guide.id,
                            label: guide.name,
                        }))}
                        multiple
                        value={[...guideIds]}
                        onValueChange={(ids) => setGuideIds(new Set(ids))}
                    >
                        <ComboboxChips ref={chipsAnchor} id="project-guides">
                            <ComboboxValue>
                                {(value: string[]) =>
                                    value.map((id) => (
                                        <ComboboxChip
                                            key={id}
                                            className="text-sm"
                                        >
                                            {activeGuides.find(
                                                (guide) => guide.id === id,
                                            )?.name ?? id}
                                        </ComboboxChip>
                                    ))
                                }
                            </ComboboxValue>
                            <ComboboxChipsInput
                                placeholder={
                                    guideIds.size === 0
                                        ? 'Buscar una guía…'
                                        : undefined
                                }
                            />
                        </ComboboxChips>
                        <ComboboxContent anchor={chipsAnchor}>
                            <ComboboxEmpty>
                                No se encontraron guías
                            </ComboboxEmpty>
                            <ComboboxList>
                                {(item: { value: string; label: string }) => (
                                    <ComboboxItem
                                        key={item.value}
                                        value={item.value}
                                        className="text-base"
                                    >
                                        {item.label}
                                    </ComboboxItem>
                                )}
                            </ComboboxList>
                        </ComboboxContent>
                    </Combobox>
                </div>

                <fieldset className="grid gap-1.5">
                    <legend className="mb-1.5 text-sm font-medium">
                        Color
                    </legend>
                    <div className="flex flex-wrap gap-2">
                        {PROJECT_COLORS.map((c) => (
                            <button
                                key={c}
                                type="button"
                                aria-label={PROJECT_COLOR_STYLES[c].label}
                                aria-pressed={color === c}
                                onClick={() => setColor(c)}
                                className={cn(
                                    'size-8 rounded-full ring-offset-2 ring-offset-background',
                                    PROJECT_COLOR_STYLES[c].swatch,
                                    color === c
                                        ? 'ring-2 ring-ring'
                                        : 'hover:ring-2 hover:ring-border',
                                )}
                            />
                        ))}
                    </div>
                </fieldset>
                <div className="grid gap-1.5">
                    <Label htmlFor="project-description">
                        Cómo dar de alta la actividad en Ágora
                    </Label>
                    <RichTextEditor
                        value={description}
                        onChange={setDescription}
                    />
                </div>

                {project && (
                    <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                            checked={active}
                            disabled={submitting}
                            onCheckedChange={setActive}
                        />
                        {active ? 'Activo' : 'Desactivado'}
                    </label>
                )}
            </form>

            <DialogFooter>
                <Button type="submit" form="project-form" disabled={submitting}>
                    {submitting ? 'Guardando…' : 'Guardar'}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
};

interface ProjectFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    // null = crear, proyecto = editar.
    project: Project | null;
    onSaved: (project: Project) => void;
}

export const ProjectFormDialog = ({
    open,
    onOpenChange,
    project,
    onSaved,
}: ProjectFormDialogProps) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        {open && (
            <ProjectFormBody
                key={project?.id ?? 'new'}
                project={project}
                onSaved={onSaved}
                onClose={() => onOpenChange(false)}
            />
        )}
    </Dialog>
);
