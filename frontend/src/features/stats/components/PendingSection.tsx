import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChartCard } from '@/features/stats/components/ChartCard';
import { RankList } from '@/features/stats/components/StatsChartKit';
import {
    ParticipantsCountDialog,
    type ParticipantsEvent,
} from '@/features/events/components/ParticipantsCountDialog';
import { formatStatsDate, type StatsSummary } from '@/features/stats/lib/stats';

interface PendingSectionProps {
    stats: StatsSummary;
    onSaved: () => void;
}

export const PendingSection = ({ stats, onSaved }: PendingSectionProps) => {
    const [participantsEvent, setParticipantsEvent] =
        useState<ParticipantsEvent | null>(null);

    return (
        <ChartCard
            title="Finalizados sin dato de atendidos"
            description={`${stats.finishedWithoutAttended.count} evento(s) pendientes de rellenar.`}
            empty={stats.finishedWithoutAttended.count === 0}
        >
            <RankList
                rows={stats.finishedWithoutAttended.events.map((e) => ({
                    id: e.id,
                    title: e.title,
                    meta: formatStatsDate(e.startsAt),
                    action: (
                        <Button
                            size="sm"
                            onClick={() =>
                                setParticipantsEvent({
                                    id: e.id,
                                    title: e.title,
                                    participantsCount: null,
                                    participantsObservations: null,
                                })
                            }
                        >
                            Añadir atendidos
                        </Button>
                    ),
                }))}
            />
            <ParticipantsCountDialog
                open={participantsEvent !== null}
                onOpenChange={(open) => !open && setParticipantsEvent(null)}
                event={participantsEvent}
                onSaved={onSaved}
            />
        </ChartCard>
    );
};
