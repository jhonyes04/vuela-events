import { useEffect, useState, type FormEvent } from 'react';
import { CircleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    getEmailSettings,
    updateSmtpConfig,
    updateTemplateAssignment,
    type SlotId,
    type SmtpConfig,
    type TemplateAssignment,
} from '@/features/emailSettings/lib/emailSettings';
import { useEmailTemplatesStore } from '@/features/emailTemplates/store';
import { ApiError } from '@/lib/api';
import { PageTitle } from '@/components/PageTitle';

const SLOT_LABELS: Record<SlotId, string> = {
    convocatoria: 'Convocatoria',
    parte_firmas: 'Parte de firmas',
};

const EMPTY_SMTP: SmtpConfig = { host: '', port: 587, secure: true };

export const EmailSettingsPage = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [smtp, setSmtp] = useState<SmtpConfig>(EMPTY_SMTP);
    const [assignments, setAssignments] = useState<TemplateAssignment[]>([]);
    const templates = useEmailTemplatesStore((s) => s.items);
    const loadTemplates = useEmailTemplatesStore((s) => s.load);
    const [savingSmtp, setSavingSmtp] = useState(false);
    const [savingSlot, setSavingSlot] = useState<SlotId | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);

        try {
            // Las plantillas vienen de la caché compartida; se refrescan al entrar.
            const [settings] = await Promise.all([
                getEmailSettings(),
                loadTemplates(true),
            ]);

            setSmtp(settings.smtpConfig ?? EMPTY_SMTP);
            setAssignments(settings.templateAssignments);
            // El store no lanza: deja su fallo en `error`.
            setError(useEmailTemplatesStore.getState().error);
        } catch (e) {
            setError(
                e instanceof ApiError
                    ? e.message
                    : 'No se pudo cargar la configuración',
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void Promise.resolve().then(load);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const activeTemplates = templates.filter((t) => t.active);

    const handleSmtpSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setSavingSmtp(true);

        try {
            const saved = await updateSmtpConfig(smtp);

            setSmtp(saved);
            toast.success('Configuración guardada.');
        } catch (err) {
            toast.error(
                err instanceof ApiError ? err.message : 'No se pudo guardar',
            );
        } finally {
            setSavingSmtp(false);
        }
    };

    const handleAssignmentChange = async (slot: SlotId, templateId: string) => {
        setSavingSlot(slot);

        try {
            const updated = await updateTemplateAssignment(
                slot,
                templateId || null,
            );

            setAssignments((prev) =>
                prev.map((a) => (a.slot === slot ? updated : a)),
            );

            toast.success('Asignación guardada.');
        } catch (err) {
            toast.error(
                err instanceof ApiError ? err.message : 'No se pudo guardar',
            );
        } finally {
            setSavingSlot(null);
        }
    };

    if (loading) {
        return (
            <p role="status" className="text-muted-foreground">
                Cargando configuración…
            </p>
        );
    }

    return (
        <section className="grid max-w-xl mx-auto gap-8">
            <div>
                <PageTitle>Configuración de Correo</PageTitle>

                {error && (
                    <Alert variant="destructive" className="mb-4">
                        <CircleAlert />
                        <AlertTitle>No se pudo cargar</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
            </div>

            <div className="rounded-xl border bg-card p-4">
                <h2 className="mb-1 font-medium">Servidor SMTP</h2>
                <p className="mb-4 text-sm text-muted-foreground">
                    Sin usuario ni contraseña: se piden justo antes de enviar,
                    nunca se guardan.
                </p>

                <form
                    id="smtp-form"
                    onSubmit={(e) => void handleSmtpSubmit(e)}
                    className="grid gap-4"
                >
                    <div className="grid gap-1.5">
                        <Label htmlFor="smtp-host">Servidor *</Label>
                        <Input
                            id="smtp-host"
                            required
                            maxLength={255}
                            placeholder="smtp.gmail.com"
                            value={smtp.host}
                            onChange={(e) =>
                                setSmtp((v) => ({
                                    ...v,
                                    host: e.target.value,
                                }))
                            }
                        />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-1.5">
                            <Label htmlFor="smtp-port">Puerto *</Label>
                            <Input
                                id="smtp-port"
                                type="number"
                                required
                                min={1}
                                max={65535}
                                value={smtp.port}
                                onChange={(e) =>
                                    setSmtp((v) => ({
                                        ...v,
                                        port: Number(e.target.value),
                                    }))
                                }
                            />
                        </div>

                        <label className="flex items-end gap-2 pb-2 text-sm">
                            <input
                                type="checkbox"
                                className="size-4 accent-primary"
                                checked={smtp.secure}
                                onChange={(e) =>
                                    setSmtp((v) => ({
                                        ...v,
                                        secure: e.target.checked,
                                    }))
                                }
                            />
                            TLS
                        </label>
                    </div>
                </form>

                <div className="mt-4 flex justify-end">
                    <Button
                        type="submit"
                        form="smtp-form"
                        disabled={savingSmtp}
                    >
                        {savingSmtp ? 'Guardando…' : 'Guardar'}
                    </Button>
                </div>
            </div>

            <div className="rounded-xl border bg-card p-4">
                <h2 className="mb-1 font-medium">Asignación de plantillas</h2>
                <p className="mb-4 text-sm text-muted-foreground">
                    Qué plantilla usa cada botón de envío.
                </p>

                <div className="grid gap-4">
                    {assignments.map(({ slot, templateId }) => (
                        <div key={slot} className="grid gap-1.5">
                            <Label htmlFor={`slot-${slot}`}>
                                {SLOT_LABELS[slot]}
                            </Label>
                            <Select
                                value={templateId ?? ''}
                                items={[
                                    { value: '', label: 'Sin asignar' },
                                    ...activeTemplates.map((t) => ({
                                        value: t.id,
                                        label: t.name,
                                    })),
                                ]}
                                onValueChange={(value) =>
                                    void handleAssignmentChange(
                                        slot,
                                        value ?? '',
                                    )
                                }
                            >
                                <SelectTrigger
                                    id={`slot-${slot}`}
                                    className="w-full"
                                    disabled={savingSlot === slot}
                                >
                                    <SelectValue placeholder="Sin asignar" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="" label="Sin asignar">
                                        Sin asignar
                                    </SelectItem>
                                    {activeTemplates.map((t) => (
                                        <SelectItem
                                            key={t.id}
                                            value={t.id}
                                            label={t.name}
                                        >
                                            {t.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};
