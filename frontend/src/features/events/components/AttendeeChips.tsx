import {
    attendeeAvatarUrl,
    personLabel,
    type Attendee,
} from '@/features/events/lib/events';

interface AttendeeChipsProps {
    // Para construir la URL de cada foto.
    eventId: string;
    attendees: Attendee[];
    // Solo se muestran checkboxes cuando se pasa onToggle (p. ej. gestión).
    selected?: Set<string>;
    onToggle?: (id: string) => void;
}

export const AttendeeChips = ({
    eventId,
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
                {person.avatarConfigured ? (
                    <img
                        src={attendeeAvatarUrl(eventId, person.id)}
                        alt=""
                        className="size-6 shrink-0 rounded-full object-cover"
                    />
                ) : (
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-ink text-[10px] font-semibold text-white">
                        {person.name[0]}
                    </span>
                )}
                <span className="break-words">{personLabel(person)}</span>
            </li>
        ))}
    </ul>
);
