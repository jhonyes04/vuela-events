import { useEffect, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { IconTooltip } from '@/components/IconTooltip';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { PageTitle } from '@/components/PageTitle';
import { ListErrors } from '@/features/users/components/ListErrors';
import { ProjectFormDialog } from '@/features/projects/components/ProjectFormDialog';
import {
    deleteProject,
    type Project,
} from '@/features/projects/lib/projects';
import { PROJECT_COLOR_STYLES } from '@/features/projects/lib/colors';
import { useProjectsStore } from '@/features/projects/store';

export const ProjectsPage = () => {
    const projects = useProjectsStore((s) => s.items);
    const loading = useProjectsStore((s) => s.loading);
    const error = useProjectsStore((s) => s.error);
    const load = useProjectsStore((s) => s.load);
    const upsert = useProjectsStore((s) => s.upsert);
    const remove = useProjectsStore((s) => s.remove);
    const [formOpen, setFormOpen] = useState(false);
    const [formKey, setFormKey] = useState(0);
    const [editing, setEditing] = useState<Project | null>(null);
    const [deleting, setDeleting] = useState<Project | null>(null);

    // Al entrar se refresca, pero la lista en caché se ve mientras tanto.
    useEffect(() => {
        void load(true);
    }, [load]);

    const openCreate = () => {
        setEditing(null);
        setFormKey((k) => k + 1);
        setFormOpen(true);
    };

    const openEdit = (project: Project) => {
        setEditing(project);
        setFormKey((k) => k + 1);
        setFormOpen(true);
    };

    return (
        <section>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <PageTitle>Gestionar Proyectos</PageTitle>
                <Button onClick={openCreate}>Nuevo proyecto</Button>
            </div>

            <ListErrors
                error={error}
                actionError={null}
                onRetry={() => void load(true)}
            />

            {loading ? (
                <p role="status" className="text-muted-foreground">
                    Cargando proyectos…
                </p>
            ) : projects.length === 0 ? (
                <p className="text-muted-foreground">
                    Todavía no hay proyectos.
                </p>
            ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                    {projects.map((project) => (
                        <li
                            key={project.id}
                            className="flex items-center gap-3 rounded-xl border bg-card p-4"
                        >
                            <span
                                className={`size-4 shrink-0 rounded-full ${PROJECT_COLOR_STYLES[project.color].swatch}`}
                            />
                            <span className="flex-1 truncate font-medium">
                                {project.name}
                            </span>
                            {!project.active && (
                                <Badge variant="secondary">Inactiva</Badge>
                            )}
                            <IconTooltip label="Editar">
                                <Button
                                    variant="secondary"
                                    size="icon"
                                    aria-label="Editar"
                                    onClick={() => openEdit(project)}
                                >
                                    <Pencil className="size-4" />
                                </Button>
                            </IconTooltip>
                            <IconTooltip label="Eliminar">
                                <Button
                                    variant="destructive"
                                    size="icon"
                                    aria-label="Eliminar"
                                    onClick={() => setDeleting(project)}
                                >
                                    <Trash2 className="size-4" />
                                </Button>
                            </IconTooltip>
                        </li>
                    ))}
                </ul>
            )}

            <ProjectFormDialog
                key={formKey}
                open={formOpen}
                onOpenChange={setFormOpen}
                project={editing}
                onSaved={upsert}
            />

            {deleting && (
                <ConfirmDeleteDialog
                    open={deleting !== null}
                    onOpenChange={(open) => !open && setDeleting(null)}
                    title="Eliminar proyecto"
                    description={`¿Eliminar «${deleting.name}»? Esta acción no se puede deshacer.`}
                    confirmLabel="Eliminar"
                    deletingLabel="Eliminando…"
                    errorFallback="No se pudo eliminar el proyecto"
                    successLabel={`Proyecto «${deleting.name}» eliminado.`}
                    onConfirm={() => deleteProject(deleting.id)}
                    onDeleted={() => {
                        remove(deleting.id);
                        setDeleting(null);
                    }}
                />
            )}
        </section>
    );
};
