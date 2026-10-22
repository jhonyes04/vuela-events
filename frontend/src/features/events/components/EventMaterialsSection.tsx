import { PackageOpen } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { IconTooltip } from '@/components/IconTooltip';
import type { EventItem } from '@/features/events/lib/events';

interface EventMaterialsSectionProps {
    materials: EventItem['materials'];
}

export const EventMaterialsSection = ({
    materials,
}: EventMaterialsSectionProps) => {
    if (materials.length === 0) return null;

    return (
        <fieldset className="grid grid-cols-1 items-start gap-x-3 gap-y-2 rounded-xl border p-3 text-sm text-muted-foreground sm:grid-cols-[auto_1fr]">
            <legend className="flex items-center gap-1.5 whitespace-nowrap px-1 font-bold">
                <PackageOpen className="size-4 shrink-0 text-brand-green" />
                Materiales
            </legend>
            <div className="flex flex-wrap items-center gap-2">
                {materials.map((material) => {
                    const badge = (
                        <Badge
                            variant="default"
                            className="bg-orange-300 text-black cursor-pointer"
                        >
                            {material.name}
                        </Badge>
                    );

                    if (!material.observations) {
                        return (
                            <IconTooltip
                                key={material.id}
                                label="Sin observaciones"
                            >
                                <div>{badge}</div>
                            </IconTooltip>
                        );
                    }

                    return (
                        <AlertDialog key={material.id}>
                            <IconTooltip label="Ver observaciones">
                                <AlertDialogTrigger
                                    render={<button type="button" />}
                                >
                                    {badge}
                                </AlertDialogTrigger>
                            </IconTooltip>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>
                                        {material.name}
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                        {material.observations}
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel variant="default">
                                        Cerrar
                                    </AlertDialogCancel>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    );
                })}
            </div>
        </fieldset>
    );
};
