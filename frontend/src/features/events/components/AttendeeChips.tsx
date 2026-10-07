import { personLabel, type Attendee } from '@/features/events/lib/events';

interface AttendeeChipsProps {
    attendees: Attendee[];
    // Solo se muestran checkboxes cuando se pasa onToggle (p. ej. gestión).
    selected?: Set<string>;
    onToggle?: (id: string) => void;
}

export const AttendeeChips = ({
    attendees,
    selected,
    onToggle,
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
                <span className="break-words">{personLabel(person)}</span>
            </li>
        ))}
    </ul>
);
