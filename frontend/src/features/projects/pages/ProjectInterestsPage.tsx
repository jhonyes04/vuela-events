import { useEffect, useState } from 'react';
import { UserPlus, Users, Trash2 } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/context';
import { PageTitle } from '@/components/PageTitle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { IconTooltip } from '@/components/IconTooltip';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { ListErrors } from '@/features/users/components/ListErrors';
import {
    listProjectInterests,
    removeProjectInterestedUser,
    type ProjectInterests,
} from '@/features/projects/lib/projects';
import {
    getProjectColorBorder,
    getProjectColorTint,
} from '@/features/projects/lib/colors';
import { AddProjectInterestDialog } from '@/features/projects/components/AddProjectInterestDialog';
import { personLabel } from '@/features/events/lib/events';
import { cn } from '@/lib/utils';
import { ApiError } from '@/lib/api';

interface DeletingTarget {
    projectId: string;
    projectName: string;
    userIds: string[];
}

export const ProjectInterestsPage = () => {
    const { user } = useAuth();
    const canAdd = user?.permissions.includes('projects:edit') ?? false;
    const canDelete = user?.permissions.includes('projects:delete') ?? false;

    const [projects, setProjects] = useState<ProjectInterests[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [addingFor, setAddingFor] = useState<string | null>(null);
    // Selección independiente por proyecto: un usuario puede estar marcado
    // en varios proyectos a la vez, cada uno con su propia selección.
    const [selected, setSelected] = useState<Record<string, Set<string>>>({});
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

    const toggle = (projectId: string, userId: string) => {
        setSelected((prev) => {
            const next = new Set(prev[projectId]);

            if (next.has(userId)) next.delete(userId);
            else next.add(userId);

            return { ...prev, [projectId]: next };
        });
    };

    return (
        <section>
            <PageTitle icon={Users}>Usuarios por proyecto</PageTitle>

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
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {projects.map((project) => {
                        const border = getProjectColorBorder(project.color);
                        const tint = getProjectColorTint(project.color);
                        const projectSelected =
                            selected[project.id] ?? new Set<string>();

                        return (
                            <Card
                                key={project.id}
                                className={cn(
                                    'flex h-full flex-col gap-0 overflow-hidden border-t-4 py-0',
                                    border.className,
                                )}
                                style={border.style}
                            >
                                <CardHeader
                                    className={cn(
                                        'flex items-center justify-between px-4! py-4!',
                                        tint.className,
                                    )}
                                    style={tint.style}
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
                                <CardContent className="flex-1 px-4! py-4!">
                                    {project.users.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">
                                            Nadie ha marcado interés todavía.
                                        </p>
                                    ) : (
                                        <ul className="grid gap-1 text-sm">
                                            {project.users.map((u) => (
                                                <li
                                                    key={u.id}
                                                    className="flex items-start gap-2 rounded-md bg-card px-2 py-1.5"
                                                >
                                                    {canDelete && (
                                                        <Checkbox
                                                            className="mt-0.5"
                                                            checked={projectSelected.has(
                                                                u.id,
                                                            )}
                                                            onCheckedChange={() =>
                                                                toggle(
                                                                    project.id,
                                                                    u.id,
                                                                )
                                                            }
                                                            aria-label={`Seleccionar a ${u.name}`}
                                                        />
                                                    )}
                                                    <span className="min-w-0 flex-1 break-words">
                                                        {personLabel({
                                                            name: `${u.name}`,
                                                            puntoVuela:
                                                                u.puntoVuela,
                                                        })}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </CardContent>
                                <CardFooter className="flex items-center justify-between gap-2 px-4! py-3!">
                                    <Badge
                                        variant="default"
                                        className="bg-green-800 font-bold gap-1"
                                    >
                                        <Users className="size-3" />
                                        {project.users.length === 1
                                            ? '1 participante'
                                            : `${project.users.length} participantes`}
                                    </Badge>
                                    {canDelete && (
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            disabled={
                                                projectSelected.size === 0
                                            }
                                            onClick={() =>
                                                setDeleting({
                                                    projectId: project.id,
                                                    projectName: project.name,
                                                    userIds: [
                                                        ...projectSelected,
                                                    ],
                                                })
                                            }
                                        >
                                            <Trash2 className="size-3.5" />
                                            Quitar
                                            {projectSelected.size > 0
                                                ? ` (${projectSelected.size})`
                                                : ''}
                                        </Button>
                                    )}
                                </CardFooter>
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
                    description={
                        deleting.userIds.length === 1
                            ? `¿Quitar a este usuario de «${deleting.projectName}»?`
                            : `¿Quitar a ${deleting.userIds.length} usuarios de «${deleting.projectName}»?`
                    }
                    confirmLabel="Quitar"
                    deletingLabel="Quitando…"
                    errorFallback="No se pudo quitar a los usuarios"
                    successLabel={
                        deleting.userIds.length === 1
                            ? 'Usuario quitado.'
                            : `${deleting.userIds.length} usuarios quitados.`
                    }
                    onConfirm={async () => {
                        await Promise.all(
                            deleting.userIds.map((userId) =>
                                removeProjectInterestedUser(
                                    deleting.projectId,
                                    userId,
                                ),
                            ),
                        );

                        return listProjectInterests();
                    }}
                    onDeleted={(updated) => {
                        setProjects(updated);
                        setSelected((prev) => {
                            const next = { ...prev };

                            delete next[deleting.projectId];

                            return next;
                        });
                        setDeleting(null);
                    }}
                />
            )}
        </section>
    );
};
