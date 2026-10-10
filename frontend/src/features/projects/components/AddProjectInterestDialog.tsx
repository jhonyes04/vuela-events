import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ApiError } from '@/lib/api';
import {
    addProjectInterestedUser,
    listAilUsers,
    type AilUserOption,
    type ProjectInterests,
} from '@/features/projects/lib/projects';
import { personLabel } from '@/features/events/lib/events';

interface AddProjectInterestBodyProps {
    projectId: string;
    currentUserIds: Set<string>;
    onAdded: (projects: ProjectInterests[]) => void;
}

const AddProjectInterestBody = ({
    projectId,
    currentUserIds,
    onAdded,
}: AddProjectInterestBodyProps) => {
    const [candidates, setCandidates] = useState<AilUserOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [query, setQuery] = useState('');
    const [addingId, setAddingId] = useState<string | null>(null);

    useEffect(() => {
        listAilUsers()
            .then(setCandidates)
            .catch(() => setFailed(true))
            .finally(() => setLoading(false));
    }, []);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();

        return candidates.filter(
            (c) =>
                !currentUserIds.has(c.id) &&
                (!q || `${c.name} ${c.lastName}`.toLowerCase().includes(q)),
        );
    }, [candidates, currentUserIds, query]);

    const handleAdd = async (userId: string) => {
        setAddingId(userId);

        try {
            const projects = await addProjectInterestedUser(
                projectId,
                userId,
            );

            onAdded(projects);
            toast.success('Usuario añadido.');
        } catch (e) {
            toast.error(
                e instanceof ApiError
                    ? e.message
                    : 'No se pudo añadir al usuario',
            );
        } finally {
            setAddingId(null);
        }
    };

    return (
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Agregar usuario</DialogTitle>
                <DialogDescription>
                    Usuarios AIL activos que todavía no están marcados en
                    este proyecto.
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
                            className="flex items-center justify-between gap-2 rounded-md bg-card px-2 py-1.5 ring-1 ring-border"
                        >
                            <span className="min-w-0 flex-1 break-words">
                                {personLabel({
                                    name: `${c.name} ${c.lastName}`,
                                    puntoVuela: c.puntoVuela,
                                })}
                            </span>
                            <Button
                                type="button"
                                size="sm"
                                disabled={addingId === c.id}
                                onClick={() => void handleAdd(c.id)}
                            >
                                {addingId === c.id ? 'Añadiendo…' : 'Añadir'}
                            </Button>
                        </li>
                    ))}
                </ul>
            )}
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
                onAdded={onAdded}
            />
        )}
    </Dialog>
);
