import { useEffect, useState } from 'react';
import { UserPlus, Trash2 } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/context';
import { PageTitle } from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { IconTooltip } from '@/components/IconTooltip';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { ListErrors } from '@/features/users/components/ListErrors';
import {
    listProjectInterests,
    removeProjectInterestedUser,
    type ProjectInterests,
} from '@/features/projects/lib/projects';
import { PROJECT_COLOR_STYLES } from '@/features/projects/lib/colors';
import { AddProjectInterestDialog } from '@/features/projects/components/AddProjectInterestDialog';
import { personLabel } from '@/features/events/lib/events';
import { cn } from '@/lib/utils';
import { ApiError } from '@/lib/api';

interface DeletingTarget {
    projectId: string;
    userId: string;
    label: string;
}

export const ProjectInterestsPage = () => {
    const { user } = useAuth();
    const canAdd = user?.permissions.includes('categories:edit') ?? false;
    const canDelete = user?.permissions.includes('categories:delete') ?? false;

    const [projects, setProjects] = useState<ProjectInterests[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [addingFor, setAddingFor] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<DeletingTarget | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);

        try {
            setProjects(await listProjectInterests());
        } catch (e) {
            setError(
                e instanceof ApiError
                    ? e.message
                    : 'No se pudo cargar la lista',
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void Promise.resolve().then(load);
    }, []);

    return (
        <section>
            <PageTitle>Usuarios por proyecto</PageTitle>

            <ListErrors
                error={error}
                actionError={null}
                onRetry={() => void load()}
            />

            {loading ? (
                <p role="status" className="text-muted-foreground">
                    Cargando…
                </p>
            ) : projects.length === 0 ? (
                <p className="text-muted-foreground">
                    Todavía no hay proyectos.
                </p>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                    {projects.map((project) => {
                        const colorStyle =
                            PROJECT_COLOR_STYLES[project.color];

                        return (
                            <Card
                                key={project.id}
                                className={cn(
                                    'gap-0 overflow-hidden border-t-4 py-0',
                                    colorStyle.border,
                                )}
                            >
                                <CardHeader
                                    className={cn(
                                        'flex items-center justify-between px-4! py-4!',
                                        colorStyle.tint,
                                    )}
                                >
                                    <h3 className="font-heading text-base leading-snug font-semibold">
                                        {project.name}
                                    </h3>
                                    {canAdd && (
                                        <IconTooltip label="Agregar usuario">
                                            <Button
                                                variant="secondary"
                                                size="icon-sm"
                                                aria-label="Agregar usuario"
                                                onClick={() =>
                                                    setAddingFor(project.id)
                                                }
                                            >
                                                <UserPlus className="size-3.5" />
                                            </Button>
                                        </IconTooltip>
                                    )}
                                </CardHeader>
                                <CardContent className="px-4! py-4!">
                                    {project.users.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">
                                            Nadie ha marcado interés todavía.
                                        </p>
                                    ) : (
                                        <ul className="grid gap-1 text-sm">
                                            {project.users.map((u) => (
                                                <li
                                                    key={u.id}
                                                    className="flex items-center gap-2 rounded-md bg-card px-2 py-1"
                                                >
                                                    <span className="min-w-0 flex-1 break-words">
                                                        {personLabel({
                                                            name: `${u.name}`,
                                                            puntoVuela:
                                                                u.puntoVuela,
                                                        })}
                                                    </span>
                                                    {canDelete && (
                                                        <IconTooltip label="Quitar">
                                                            <Button
                                                                variant="destructive"
                                                                size="icon-sm"
                                                                aria-label={`Quitar a ${u.name}`}
                                                                onClick={() =>
                                                                    setDeleting(
                                                                        {
                                                                            projectId:
                                                                                project.id,
                                                                            userId: u.id,
                                                                            label: `${u.name} ${u.lastName}`,
                                                                        },
                                                                    )
                                                                }
                                                            >
                                                                <Trash2 className="size-3.5" />
                                                            </Button>
                                                        </IconTooltip>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {addingFor && (
                <AddProjectInterestDialog
                    open={addingFor !== null}
                    onOpenChange={(open) => !open && setAddingFor(null)}
                    projectId={addingFor}
                    currentUserIds={
                        new Set(
                            projects
                                .find((c) => c.id === addingFor)
                                ?.users.map((u) => u.id) ?? [],
                        )
                    }
                    onAdded={setProjects}
                />
            )}

            {deleting && (
                <ConfirmDeleteDialog
                    open={deleting !== null}
                    onOpenChange={(open) => !open && setDeleting(null)}
                    title="Quitar del proyecto"
                    description={`¿Quitar a «${deleting.label}» de este proyecto? Esta acción no se puede deshacer.`}
                    confirmLabel="Quitar"
                    deletingLabel="Quitando…"
                    errorFallback="No se pudo quitar al usuario"
                    successLabel="Usuario quitado."
                    onConfirm={() =>
                        removeProjectInterestedUser(
                            deleting.projectId,
                            deleting.userId,
                        )
                    }
                    onDeleted={(updated) => {
                        setProjects(updated);
                        setDeleting(null);
                    }}
                />
            )}
        </section>
    );
};
