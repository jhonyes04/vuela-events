import { useState, type FormEvent } from 'react';
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
    const [name, setName] = useState(project?.name ?? '');
    const [color, setColor] = useState<ProjectColor>(
        project?.color ?? PROJECT_COLORS[0],
    );
    const [active, setActive] = useState(project?.active ?? true);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const saved = project
                ? await updateProject(project.id, { name, color, active })
                : await createProject({ name, color });

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
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>
                    {project ? 'Editar proyecto' : 'Nuevo proyecto'}
                </DialogTitle>
                <DialogDescription>
                    El color se usa para diferenciarlo en el calendario.
                </DialogDescription>
            </DialogHeader>

            <form
                id="category-form"
                onSubmit={(e) => void handleSubmit(e)}
                className="grid gap-4"
            >
                <div className="grid gap-1.5">
                    <Label htmlFor="category-name">Nombre *</Label>
                    <Input
                        id="category-name"
                        required
                        minLength={2}
                        maxLength={80}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
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

                {project && (
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            className="size-4 accent-primary"
                            checked={active}
                            onChange={(e) => setActive(e.target.checked)}
                        />
                        Activo
                    </label>
                )}

            </form>

            <DialogFooter>
                <Button
                    type="submit"
                    form="category-form"
                    disabled={submitting}
                >
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
