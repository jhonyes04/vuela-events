import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ApiError } from '@/lib/api';
import {
    setUserMenuStyle as saveUserMenuStyle,
    type UserMenuStyle,
} from '@/features/appSettings/lib/appSettings';
import { useAppSettingsStore } from '@/features/appSettings/store';

const USER_MENU_STYLE_OPTIONS: { value: UserMenuStyle; label: string }[] = [
    { value: 'dropdown', label: 'Menú desplegable (popover junto al avatar)' },
    { value: 'sheet', label: 'Panel lateral (offcanvas desde la derecha)' },
];

interface UserMenuStyleCardProps {
    loading: boolean;
}

export const UserMenuStyleCard = ({ loading }: UserMenuStyleCardProps) => {
    const storeStyle = useAppSettingsStore((s) => s.userMenuStyle);
    const applyStyle = useAppSettingsStore((s) => s.setUserMenuStyle);
    const [style, setStyle] = useState<UserMenuStyle>('dropdown');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        void Promise.resolve().then(() => setStyle(storeStyle));
    }, [storeStyle]);

    const handleSave = async () => {
        setSaving(true);

        try {
            const { userMenuStyle: saved } = await saveUserMenuStyle(style);

            applyStyle(saved);
            toast.success('Ajuste guardado.');
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
                <h2 className="text-sm font-medium">Menú de usuario</h2>
                <p className="text-sm text-muted-foreground">
                    Cómo se muestra el menú del avatar (Mi perfil, Gestión,
                    Estadísticas, Administración) para todos los usuarios.
                </p>
            </div>

            {loading ? (
                <p role="status" className="text-sm text-muted-foreground">
                    Cargando…
                </p>
            ) : (
                <RadioGroup
                    className="grid gap-3"
                    value={style}
                    onValueChange={(value) =>
                        setStyle(value as UserMenuStyle)
                    }
                >
                    {USER_MENU_STYLE_OPTIONS.map((option) => (
                        <div
                            key={option.value}
                            className="flex items-center gap-2"
                        >
                            <RadioGroupItem
                                id={`user-menu-style-${option.value}`}
                                value={option.value}
                            />
                            <Label
                                htmlFor={`user-menu-style-${option.value}`}
                            >
                                {option.label}
                            </Label>
                        </div>
                    ))}
                </RadioGroup>
            )}

            <div className="flex justify-end">
                <Button
                    type="button"
                    disabled={loading || saving}
                    onClick={() => void handleSave()}
                >
                    {saving ? 'Guardando…' : 'Guardar'}
                </Button>
            </div>
        </div>
    );
};
