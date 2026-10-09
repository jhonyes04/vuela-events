import { useEffect, useMemo, useState } from 'react';
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
import {
    adminRegisterUser,
    listRegistrationCandidates,
    type RegistrationCandidate,
} from '@/features/events/lib/events';

interface AddParticipantsBodyProps {
    eventId: string;
    onClose: () => void;
    onAdded: () => void;
}

const AddParticipantsBody = ({
    eventId,
    onClose,
    onAdded,
}: AddParticipantsBodyProps) => {
    const [candidates, setCandidates] = useState<RegistrationCandidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        listRegistrationCandidates(eventId)
            .then((list) => setCandidates(list.filter((c) => !c.registered)))
            .catch(() => setFailed(true))
            .finally(() => setLoading(false));
    }, [eventId]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();

        if (!q) return candidates;

        return candidates.filter((c) =>
            `${c.name} ${c.lastName}`.toLowerCase().includes(q),
        );
    }, [candidates, query]);

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
            ids.map((id) => adminRegisterUser(eventId, id)),
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
                    ? 'Participante añadido.'
                    : `${ids.length} participantes añadidos.`,
            );
        }

        setSubmitting(false);
        onAdded();
        onClose();
    };

    return (
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Agregar participantes</DialogTitle>
                <DialogDescription>
                    Se inscriben aunque el aforo esté completo.
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
                    Todos están ya inscritos, o no hay coincidencias.
                </p>
            ) : (
                <ul className="grid max-h-80 gap-1 overflow-y-auto rounded-lg bg-muted/50 p-2 text-sm">
                    {filtered.map((c) => (
                        <li
                            key={c.id}
                            className="flex items-center gap-2 rounded-md bg-card px-2 py-1 ring-1 ring-border"
                        >
                            <input
                                type="checkbox"
                                className="size-4 shrink-0 accent-primary"
                                checked={selected.has(c.id)}
                                onChange={() => toggle(c.id)}
                                aria-label={`Seleccionar a ${c.name} ${c.lastName}`}
                            />
                            <span className="min-w-0 flex-1 break-words">
                                {c.name} {c.lastName}
                                {c.puntoVuela && (
                                    <span className="text-muted-foreground">
                                        {' '}
                                        · {c.puntoVuela}
                                    </span>
                                )}
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

interface AddParticipantsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    eventId: string;
    onAdded: () => void;
}

export const AddParticipantsDialog = ({
    open,
    onOpenChange,
    eventId,
    onAdded,
}: AddParticipantsDialogProps) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        {open && (
            <AddParticipantsBody
                key={eventId}
                eventId={eventId}
                onClose={() => onOpenChange(false)}
                onAdded={onAdded}
            />
        )}
    </Dialog>
);
