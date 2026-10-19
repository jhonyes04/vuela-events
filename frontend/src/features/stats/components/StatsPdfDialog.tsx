import { useState } from 'react';
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
import { PRINT_SECTIONS } from '@/features/stats/lib/printSections';
import type { SectionId } from '@/features/stats/lib/sections';
import { Label } from '@/components/ui/label';

interface StatsPdfDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    allYears: boolean;
    onConfirm: (selected: SectionId[]) => void;
}

const availableSections = (allYears: boolean) =>
    PRINT_SECTIONS.filter((section) => allYears || !section.onlyAllYears);

export const StatsPdfDialog = ({
    open,
    onOpenChange,
    allYears,
    onConfirm,
}: StatsPdfDialogProps) => {
    const sections = availableSections(allYears);
    const [selected, setSelected] = useState<Set<SectionId>>(
        new Set(sections.map((section) => section.id)),
    );

    const handleOpenChange = (next: boolean) => {
        onOpenChange(next);

        // Cada vez que se abre, todo marcado por defecto
        if (next) {
            setSelected(new Set(sections.map((section) => section.id)));
        }
    };

    const toggle = (id: SectionId, checked: boolean) =>
        setSelected((prev) => {
            const next = new Set(prev);

            if (checked) next.add(id);
            else next.delete(id);

            return next;
        });

    const toggleGroup = (items: typeof sections) => {
        const allSelected = items.every((item) => selected.has(item.id));

        setSelected((prev) => {
            const next = new Set(prev);

            for (const item of items) {
                if (allSelected) next.delete(item.id);
                else next.add(item.id);
            }

            return next;
        });
    };

    const groups = new Map<string, typeof sections>();

    for (const section of sections) {
        groups.set(section.group, [
            ...(groups.get(section.group) ?? []),
            section,
        ]);
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Descargar estadísticas en PDF</DialogTitle>
                    <DialogDescription>
                        Elige qué graficos incluir en el PDF.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid max-h-[60vh] gap-3 overflow-y-auto pr-1">
                    {[...groups.entries()].map(([group, items]) => {
                        const allSelected = items.every((item) =>
                            selected.has(item.id),
                        );

                        return (
                            <fieldset
                                key={group}
                                className="grid gap-2 rounded-xl border p-3"
                            >
                                <legend className="px-1 text-sm font-medium">
                                    {group}
                                </legend>

                                <div className="grid gap-1">
                                    <Button
                                        type="button"
                                        variant={
                                            allSelected ? 'default' : 'outline'
                                        }
                                        size="xs"
                                        className="h-auto justify-self-end p-1 font-normal"
                                        onClick={() => toggleGroup(items)}
                                    >
                                        {allSelected ? 'Ninguno' : 'Todos'}
                                    </Button>
                                    {items.map((item) => (
                                        <Label
                                            key={item.id}
                                            className="flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-sm hover:bg-muted"
                                        >
                                            <span>{item.label}</span>
                                            <Checkbox
                                                checked={selected.has(item.id)}
                                                onCheckedChange={(checked) =>
                                                    toggle(item.id, checked)
                                                }
                                            />
                                        </Label>
                                    ))}
                                </div>
                            </fieldset>
                        );
                    })}
                </div>

                <DialogFooter>
                    <Button
                        disabled={selected.size === 0}
                        onClick={() => {
                            onOpenChange(false);
                            onConfirm([...selected]);
                        }}
                    >
                        Generar PDF
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
