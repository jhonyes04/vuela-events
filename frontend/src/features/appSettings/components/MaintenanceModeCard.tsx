import { useState } from 'react';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/features/auth/hooks/context';
import { ApiError } from '@/lib/api';
import { setMaintenanceMode as saveMaintenanceMode } from '@/features/appSettings/lib/appSettings';
import { useAppSettingsStore } from '@/features/appSettings/store';

export const MaintenanceModeCard = () => {
    const { user } = useAuth();
    const storeMaintenance = useAppSettingsStore((s) => s.maintenanceMode);
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
        </div>
    );
};
