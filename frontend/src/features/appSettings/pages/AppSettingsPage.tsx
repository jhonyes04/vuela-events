import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { SlidersHorizontal } from 'lucide-react';
import { PageTitle } from '@/components/PageTitle';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/features/auth/hooks/context';
import {
    setUserMenuStyle as saveUserMenuStyle,
    setMaintenanceMode as saveMaintenanceMode,
    sendMaintenanceNotice,
    type UserMenuStyle,
} from '@/features/appSettings/lib/appSettings';
import { useAppSettingsStore } from '@/features/appSettings/store';

const USER_MENU_STYLE_OPTIONS: { value: UserMenuStyle; label: string }[] = [
    { value: 'dropdown', label: 'Menú desplegable (popover junto al avatar)' },
    { value: 'sheet', label: 'Panel lateral (offcanvas desde la derecha)' },
];

export const AppSettingsPage = () => {
    const { user } = useAuth();
    const storeStyle = useAppSettingsStore((s) => s.userMenuStyle);
    const storeMaintenance = useAppSettingsStore((s) => s.maintenanceMode);
    const loadStore = useAppSettingsStore((s) => s.load);
    const applyStyle = useAppSettingsStore((s) => s.setUserMenuStyle);
    const applyMaintenance = useAppSettingsStore((s) => s.setMaintenanceMode);
    const [userMenuStyle, setUserMenuStyle] =
        useState<UserMenuStyle>('dropdown');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savingMaintenance, setSavingMaintenance] = useState(false);
    const [noticeFromDate, setNoticeFromDate] = useState('');
    const [noticeFromTime, setNoticeFromTime] = useState('');
    const [noticeToDate, setNoticeToDate] = useState('');
    const [noticeToTime, setNoticeToTime] = useState('');
    const [noticeReason, setNoticeReason] = useState('');
    const [sendingNotice, setSendingNotice] = useState(false);

    useEffect(() => {
        void loadStore().finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        void Promise.resolve().then(() => setUserMenuStyle(storeStyle));
    }, [storeStyle]);

    const handleSave = async () => {
        setSaving(true);

        try {
            const { userMenuStyle: saved } =
                await saveUserMenuStyle(userMenuStyle);

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

    const handleToggleMaintenance = async () => {
        setSavingMaintenance(true);

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
            setSavingMaintenance(false);
        }
    };

    const handleSendMaintenanceNotice = async (e: FormEvent) => {
        e.preventDefault();
        setSendingNotice(true);

        try {
            const from = new Date(
                `${noticeFromDate}T${noticeFromTime}`,
            ).toISOString();
            const to = new Date(
                `${noticeToDate}T${noticeToTime}`,
            ).toISOString();

            await sendMaintenanceNotice({ from, to, reason: noticeReason });

            toast.success('Aviso de mantenimiento enviado.');
            setNoticeReason('');
        } catch (err) {
            toast.error(
                err instanceof ApiError
                    ? err.message
                    : 'No se pudo enviar el aviso',
            );
        } finally {
            setSendingNotice(false);
        }
    };

    return (
        <section className="mx-auto grid w-full max-w-xl gap-6">
            <PageTitle icon={SlidersHorizontal}>Ajustes de la app</PageTitle>

            {user?.isSuperadmin && (
                <div className="grid gap-4 rounded-xl border bg-card p-4 sm:p-6">
                    <div className="grid gap-1">
                        <h2 className="text-sm font-medium">
                            Modo mantenimiento
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Mientras esté activo, solo los superadmin pueden
                            usar la app. El resto verá una pantalla de
                            mantenimiento.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <Label htmlFor="maintenance-mode">
                            {storeMaintenance ? 'Activado' : 'Desactivado'}
                        </Label>
                        <Switch
                            id="maintenance-mode"
                            checked={storeMaintenance}
                            disabled={savingMaintenance}
                            onCheckedChange={() =>
                                void handleToggleMaintenance()
                            }
                        />
                    </div>
                </div>
            )}

            {user?.isSuperadmin && (
                <div className="grid gap-4 rounded-xl border bg-card p-4 sm:p-6">
                    <div className="grid gap-1">
                        <h2 className="text-sm font-medium">
                            Avisar mantenimiento
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Envía un correo a todos los usuarios activos
                            avisando del periodo de mantenimiento. No activa
                            el modo mantenimiento por sí solo.
                        </p>
                    </div>

                    <form
                        id="maintenance-notice-form"
                        onSubmit={(e) => void handleSendMaintenanceNotice(e)}
                        className="grid gap-4"
                    >
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="grid gap-1.5">
                                <Label htmlFor="notice-from-date">
                                    Fecha inicio *
                                </Label>
                                <Input
                                    id="notice-from-date"
                                    type="date"
                                    required
                                    value={noticeFromDate}
                                    onChange={(e) =>
                                        setNoticeFromDate(e.target.value)
                                    }
                                />
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor="notice-from-time">
                                    Hora inicio *
                                </Label>
                                <Input
                                    id="notice-from-time"
                                    type="time"
                                    required
                                    value={noticeFromTime}
                                    onChange={(e) =>
                                        setNoticeFromTime(e.target.value)
                                    }
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="grid gap-1.5">
                                <Label htmlFor="notice-to-date">
                                    Fecha fin *
                                </Label>
                                <Input
                                    id="notice-to-date"
                                    type="date"
                                    required
                                    value={noticeToDate}
                                    onChange={(e) =>
                                        setNoticeToDate(e.target.value)
                                    }
                                />
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor="notice-to-time">
                                    Hora fin *
                                </Label>
                                <Input
                                    id="notice-to-time"
                                    type="time"
                                    required
                                    value={noticeToTime}
                                    onChange={(e) =>
                                        setNoticeToTime(e.target.value)
                                    }
                                />
                            </div>
                        </div>

                        <div className="grid gap-1.5">
                            <Label htmlFor="notice-reason">Motivo *</Label>
                            <Textarea
                                id="notice-reason"
                                required
                                maxLength={500}
                                value={noticeReason}
                                onChange={(e) =>
                                    setNoticeReason(e.target.value)
                                }
                                placeholder="Actualización de servidores..."
                            />
                        </div>
                    </form>

                    <div className="flex justify-end">
                        <Button
                            type="submit"
                            form="maintenance-notice-form"
                            disabled={sendingNotice}
                        >
                            {sendingNotice ? 'Enviando…' : 'Enviar aviso'}
                        </Button>
                    </div>
                </div>
            )}

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
                        value={userMenuStyle}
                        onValueChange={(value) =>
                            setUserMenuStyle(value as UserMenuStyle)
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
        </section>
    );
};
