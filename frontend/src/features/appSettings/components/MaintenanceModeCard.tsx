import { useState } from 'react';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { DateTimePicker } from '@/features/datetime/components/DateTimePicker';
import { useAuth } from '@/features/auth/hooks/context';
import { ApiError } from '@/lib/api';
import {
    setMaintenanceMode as saveMaintenanceMode,
    setMaintenanceSchedule as saveMaintenanceSchedule,
} from '@/features/appSettings/lib/appSettings';
import { useAppSettingsStore } from '@/features/appSettings/store';
import { Button } from '@/components/ui/button';

// ISO -> 'YYYY-MM-DDTHH:mm' local, lo que espera DateTimePicker.
const toLocalValue = (iso: string | null): string => {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

interface MaintenanceScheduleFieldsProps {
    initialFrom: string | null;
    initialTo: string | null;
}

// El padre monta esto con key={`${storeFrom}-${storeTo}`}: cuando cambia el
// horario del store (p. ej. al terminar el load() async) este componente se
// remonta y el useState vuelve a leer el valor real, sin sincronizar con un
// effect.
const MaintenanceScheduleFields = ({
    initialFrom,
    initialTo,
}: MaintenanceScheduleFieldsProps) => {
    const applySchedule = useAppSettingsStore((s) => s.setMaintenanceSchedule);
    const [from, setFrom] = useState(() => toLocalValue(initialFrom));
    const [to, setTo] = useState(() => toLocalValue(initialTo));
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);

        try {
            const fromIso = from ? new Date(from).toISOString() : null;
            const toIso = to ? new Date(to).toISOString() : null;
            const result = await saveMaintenanceSchedule(fromIso, toIso);

            applySchedule(result.maintenanceFrom, result.maintenanceTo);
            toast.success('Horario establecido.');
        } catch (e) {
            toast.error(
                e instanceof ApiError ? e.message : 'No se pudo guardar',
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="grid gap-4 border-t pt-4">
            <p className="text-sm text-muted-foreground">
                Horario opcional, se muestra como cuenta atrás en la pantalla
                de mantenimiento.
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                    <Label htmlFor="maintenance-from">Inicio</Label>
                    <DateTimePicker
                        id="maintenance-from"
                        value={from}
                        onChange={setFrom}
                    />
                </div>

                <div className="grid gap-1.5">
                    <Label htmlFor="maintenance-to">Fin</Label>
                    <DateTimePicker
                        id="maintenance-to"
                        value={to}
                        onChange={setTo}
                    />
                </div>
            </div>

            <div className="flex justify-end">
                <Button
                    type="button"
                    disabled={saving}
                    onClick={() => void handleSave()}
                >
                    Guardar horario
                </Button>
            </div>
        </div>
    );
};

export const MaintenanceModeCard = () => {
    const { user } = useAuth();
    const storeMaintenance = useAppSettingsStore((s) => s.maintenanceMode);
    const storeFrom = useAppSettingsStore((s) => s.maintenanceFrom);
    const storeTo = useAppSettingsStore((s) => s.maintenanceTo);
    const applyMaintenance = useAppSettingsStore((s) => s.setMaintenanceMode);
    const [saving, setSaving] = useState(false);

    if (!user?.isSuperadmin) return null;

    const handleToggle = async () => {
        setSaving(true);

        try {
            const { maintenanceMode } =
                await saveMaintenanceMode(!storeMaintenance);

            applyMaintenance(maintenanceMode);
            toast.success(
                maintenanceMode
                    ? 'Modo mantenimiento activado.'
                    : 'Modo mantenimiento desactivado.',
            );
        } catch (e) {
            toast.error(
                e instanceof ApiError ? e.message : 'No se pudo guardar',
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="grid gap-4 rounded-xl border bg-card p-4 sm:p-6">
            <div className="grid gap-1">
                <h2 className="text-sm font-medium">Modo mantenimiento</h2>
                <p className="text-sm text-muted-foreground">
                    Mientras esté activo, solo los superadmin pueden usar la
                    app. El resto verá una pantalla de mantenimiento.
                </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
                <Label htmlFor="maintenance-mode">
                    {storeMaintenance ? 'Activado' : 'Desactivado'}
                </Label>
                <Switch
                    id="maintenance-mode"
                    checked={storeMaintenance}
                    disabled={saving}
                    onCheckedChange={() => void handleToggle()}
                />
            </div>

            {storeMaintenance && (
                <MaintenanceScheduleFields
                    key={`${storeFrom}-${storeTo}`}
                    initialFrom={storeFrom}
                    initialTo={storeTo}
                />
            )}
        </div>
    );
};
