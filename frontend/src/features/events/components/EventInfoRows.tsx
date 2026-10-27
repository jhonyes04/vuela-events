import { cn } from '@/lib/utils';
import { type ReactNode } from 'react';
import {
    Clock,
    MapPin,
    FolderKanban,
    User,
    CalendarClock,
    Calendar1,
    BookOpen,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { getProjectColorChip } from '@/features/projects/lib/colors';
import {
    dayKey,
    formatDayLabel,
    formatTime,
    type EventItem,
} from '@/features/events/lib/events';
import { personLabel } from '@/lib/personLabel';

interface EventInfoRowsProps {
    event: EventItem;
    // La ficha de detalle muestra quién organiza; la tarjeta no (ya se ve en otro sitio).
    showOrganizer?: boolean;
    // La ficha de detalle agrega el botón de ver descripción del proyecto.
    projectTrailing?: ReactNode;
    showProject?: boolean;
}

export const EventInfoRows = ({
    event,
    showOrganizer = false,
    projectTrailing,
    showProject = true,
}: EventInfoRowsProps) => {
    const chip = getProjectColorChip(event.project.color);

    return (
        <section className="grid gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2">
                {showProject && (
                    <>
                        <fieldset className="rounded-xl border p-3 text-sm text-muted-foreground sm:col-span-4">
                            <legend className="flex items-center gap-1.5 whitespace-nowrap px-1 font-bold">
                                <FolderKanban className="size-4 shrink-0 text-brand-green" />
                                Proyecto
                            </legend>
                            <p className="flex flex-wrap items-center justify-between gap-2">
                                <Badge
                                    className={chip.className}
                                    style={chip.style}
                                >
                                    {event.project.name}
                                </Badge>
                                {projectTrailing}
                            </p>
                        </fieldset>
                        {event.guide && (
                            <fieldset className="rounded-xl border p-3 text-sm text-muted-foreground sm:col-span-8">
                                <legend className="flex items-center gap-1.5 whitespace-nowrap px-1 font-bold">
                                    <BookOpen className="size-4 shrink-0 text-brand-green" />
                                    Guía
                                </legend>
                                <p className="flex items-center gap-2">
                                    <a
                                        href={event.guide.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={cn(
                                            buttonVariants({
                                                variant: 'default',
                                                size: 'xs',
                                                className:
                                                    'bg-amber-200 text-black hover:bg-amber-300',
                                            }),
                                        )}
                                    >
                                        {event.guide.name}
                                    </a>
                                </p>
                            </fieldset>
                        )}
                    </>
                )}
            </div>

            <fieldset className="rounded-xl border p-3 text-sm text-muted-foreground">
                <legend className="flex items-center gap-1.5 whitespace-nowrap px-1 font-bold">
                    <CalendarClock className="size-4 shrink-0 text-brand-green" />
                    Fecha y localización
                </legend>
                <div className="grid gap-1.5 text-sm text-muted-foreground">
                    <p className="flex items-center gap-2">
                        <Calendar1 className="size-4 shrink-0 text-brand-green" />
                        {formatDayLabel(dayKey(event.startsAt))}
                    </p>
                    <p className="flex items-center gap-2">
                        <Clock className="size-4 shrink-0 text-brand-green" />
                        {formatTime(event.startsAt)} –{' '}
                        {formatTime(event.endsAt)}
                    </p>

                    {event.location && (
                        <p className="flex items-center gap-2">
                            <MapPin className="size-4 shrink-0 text-brand-green" />
                            {event.location}
                        </p>
                    )}

                    {showOrganizer && (
                        <p className="flex items-center gap-2">
                            <User className="size-4 shrink-0 text-brand-green" />
                            {personLabel(event.createdBy)}
                        </p>
                    )}
                </div>
            </fieldset>
        </section>
    );
};
