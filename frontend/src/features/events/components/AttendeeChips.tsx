import { personLabel, type Attendee } from '@/features/events/lib/events';

interface AttendeeChipsProps {
    attendees: Attendee[];
}

export const AttendeeChips = ({ attendees }: AttendeeChipsProps) => (
    <ul className="grid gap-1 p-2 text-sm">
        {attendees.map((person) => (
            <li
                key={person.id}
                className="rounded-md bg-card px-2 py-1 break-words ring-1 ring-border"
            >
                {personLabel(person)}
            </li>
        ))}
    </ul>
);
