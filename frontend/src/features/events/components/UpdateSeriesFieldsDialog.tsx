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
import {
    SERIES_FIELD_LABELS,
    type SeriesField,
} from '@/features/events/lib/eventForm';

interface UpdateSeriesFieldsDialogProps {
    open: boolean;
    changedFields: SeriesField[];
    submitting: boolean;
    onCancel: () => void;
    onSkip: () => void;
    onConfirm: (fields: SeriesField[]) => void;
}

export const UpdateSeriesFieldsDialog = ({
    open,
    changedFields,
    submitting,
    onCancel,
    onSkip,
    onConfirm,
}: UpdateSeriesFieldsDialogProps) => {
    const [selected, setSelected] = useState<SeriesField[]>(changedFields);

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                if (!next) onCancel();
            }}
        >
            {open && (
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Actualizar la serie</DialogTitle>
                        <DialogDescription>
                            Este evento pertenece a una serie. Elige qué cambios
                            se aplican también a las sesiones futuras.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-3">
                        {changedFields.map((field) => (
                            <label
                                key={field}
                                className="flex cursor-pointer items-center gap-2 text-sm font-medium"
                            >
                                <Checkbox
                                    checked={selected.includes(field)}
                                    onCheckedChange={(checked) =>
                                        setSelected((current) =>
                                            checked
                                                ? [...current, field]
                                                : current.filter(
                                                      (f) => f !== field,
                                                  ),
                                        )
                                    }
                                />
                                {SERIES_FIELD_LABELS[field]}
                            </label>
                        ))}
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onCancel}
                            disabled={submitting}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            variant="default"
                            onClick={onSkip}
                            disabled={submitting}
                        >
                            Solo esta sesión
                        </Button>
                        <Button
                            type="button"
                            onClick={() => onConfirm(selected)}
                            disabled={submitting}
                        >
                            {submitting ? 'Guardando…' : 'Aplicar a la serie'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            )}
        </Dialog>
    );
};
