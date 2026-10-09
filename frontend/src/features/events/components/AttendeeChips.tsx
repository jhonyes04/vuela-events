import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IconTooltip } from '@/components/IconTooltip';
import { personLabel, type Attendee } from '@/features/events/lib/events';

interface AttendeeChipsProps {
    attendees: Attendee[];
    // Solo se muestran checkboxes cuando se pasa onToggle (p. ej. gestión).
    selected?: Set<string>;
    onToggle?: (id: string) => void;
    onDelete?: (attendee: Attendee) => void;
}

export const AttendeeChips = ({
    attendees,
    selected,
    onToggle,
    onDelete,
}: AttendeeChipsProps) => (
    <ul className="grid gap-1 p-2 text-sm">
        {attendees.map((person) => (
            <li
                key={person.id}
                className="flex items-center gap-2 rounded-md bg-card px-2 py-1 ring-1 ring-border"
            >
                {onToggle && (
                    <input
                        type="checkbox"
                        className="size-4 shrink-0 accent-primary"
                        checked={selected?.has(person.id) ?? false}
                        onChange={() => onToggle(person.id)}
                        aria-label={`Seleccionar a ${personLabel(person)}`}
                    />
                )}
                <span className="min-w-0 flex-1 break-words">
                    {personLabel(person)}
                </span>
                {onDelete && (
                    <IconTooltip label="Quitar del evento">
                        <Button
                            variant="destructive"
                            size="icon-sm"
                            aria-label={`Quitar a ${personLabel(person)}`}
                            onClick={() => onDelete(person)}
                        >
                            <Trash2 className="size-3.5" />
                        </Button>
                    </IconTooltip>
                )}
            </li>
        ))}
    </ul>
);
