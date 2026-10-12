import { useEffect, useMemo, useState } from 'react';
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
import { Input } from '@/components/ui/input';
import {
    addProjectInterestedUser,
    listAilUsers,
    listProjectInterests,
    type AilUserOption,
    type ProjectInterests,
} from '@/features/projects/lib/projects';
import { personLabel } from '@/features/events/lib/events';

interface AddProjectInterestBodyProps {
    projectId: string;
    currentUserIds: Set<string>;
    onClose: () => void;
    onAdded: (projects: ProjectInterests[]) => void;
}

const AddProjectInterestBody = ({
    projectId,
    currentUserIds,
    onClose,
    onAdded,
}: AddProjectInterestBodyProps) => {
    const [candidates, setCandidates] = useState<AilUserOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        listAilUsers()
            .then(setCandidates)
            .catch(() => setFailed(true))
            .finally(() => setLoading(false));
    }, []);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();

        return candidates.filter(
            (candidate) =>
                !currentUserIds.has(candidate.id) &&
                (!q ||
                    `${candidate.name} ${candidate.lastName} ${candidate.puntoVuela ?? ''}`
                        .toLowerCase()
                        .includes(q)),
        );
    }, [candidates, currentUserIds, query]);

    const toggle = (id: string) => {
        setSelected((prev) => {
            const next = new Set(prev);

            if (next.has(id)) next.delete(id);
            else next.add(id);

            return next;
        });
    };

    const handleSave = async () => {
        setSubmitting(true);

        const ids = [...selected];
        const results = await Promise.allSettled(
            ids.map((id) => addProjectInterestedUser(projectId, id)),
        );
        const failedCount = results.filter(
            (r) => r.status === 'rejected',
        ).length;

        if (failedCount > 0) {
            toast.error(
                `${failedCount} de ${ids.length} no se pudieron añadir`,
            );
        } else {
            toast.success(
                ids.length === 1
                    ? 'Usuario añadido.'
                    : `${ids.length} usuarios añadidos.`,
            );
        }

        onAdded(await listProjectInterests());
        setSubmitting(false);
        onClose();
    };

    return (
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Agregar usuarios</DialogTitle>
                <DialogDescription>
                    Usuarios AIL activos que todavía no están marcados en este
                    proyecto.
                </DialogDescription>
            </DialogHeader>

            <Input
                placeholder="Buscar por nombre…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
            />

            {loading ? (
                <p role="status" className="text-sm text-muted-foreground">
                    Cargando…
                </p>
            ) : failed ? (
                <p className="text-sm text-destructive">
                    No se pudo cargar la lista de usuarios.
                </p>
            ) : filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    No hay usuarios para añadir.
                </p>
            ) : (
                <ul className="grid max-h-80 gap-1 overflow-y-auto rounded-lg bg-muted/50 p-2 text-sm">
                    {filtered.map((c) => (
                        <li
                            key={c.id}
                            className="flex items-start gap-2 rounded-md bg-card px-2 py-1.5 ring-1 ring-border"
                        >
                            <Checkbox
                                className="mt-0.5"
                                checked={selected.has(c.id)}
                                onCheckedChange={() => toggle(c.id)}
                                aria-label={`Seleccionar a ${c.name} ${c.lastName}`}
                            />
                            <span className="min-w-0 flex-1 break-words">
                                {personLabel({
                                    name: `${c.name} ${c.lastName}`,
                                    puntoVuela: c.puntoVuela,
                                })}
                            </span>
                        </li>
                    ))}
                </ul>
            )}

            <DialogFooter>
                <Button
                    type="button"
                    disabled={selected.size === 0 || submitting}
                    onClick={() => void handleSave()}
                >
                    {submitting
                        ? 'Añadiendo…'
                        : `Añadir${selected.size > 0 ? ` (${selected.size})` : ''}`}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
};

interface AddProjectInterestDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    projectId: string;
    currentUserIds: Set<string>;
    onAdded: (projects: ProjectInterests[]) => void;
}

export const AddProjectInterestDialog = ({
    open,
    onOpenChange,
    projectId,
    currentUserIds,
    onAdded,
}: AddProjectInterestDialogProps) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        {open && (
            <AddProjectInterestBody
                key={projectId}
                projectId={projectId}
                currentUserIds={currentUserIds}
                onClose={() => onOpenChange(false)}
                onAdded={onAdded}
            />
        )}
    </Dialog>
);
