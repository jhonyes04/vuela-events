import { useEffect, useState, type SubmitEvent } from 'react';
import { CircleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
    getEmailSettings,
    updateSmtpConfig,
    updateNoReplySmtpConfig,
    updateTemplateAssignment,
    type SlotId,
    type SmtpConfig,
    type NoReplySmtpInput,
    type TemplateAssignment,
} from '@/features/appSettings/lib/emailSettings';
import { useEmailTemplatesStore } from '@/features/emailTemplates/store';
import { ApiError } from '@/lib/api';
import { SmtpConfigCard } from '@/features/appSettings/components/SmtpConfigCard';
import { NoReplySmtpConfigCard } from '@/features/appSettings/components/NoReplySmtpConfigCard';
import { TemplateAssignmentCard } from '@/features/appSettings/components/TemplateAssignmentCard';
import type { SmtpSender } from '@/features/appSettings/components/SenderBadge';

const SLOT_LABELS: Record<SlotId, string> = {
    convocatoria: 'Convocatoria',
    convocatoria_reunion: 'Convocatoria de Reunión Comarcal',
    parte_firmas: 'Parte de firmas',
    inscripcion: 'Inscripción a evento',
    cancelacion_inscripcion: 'Cancelación de inscripción',
    proyecto_nuevo: 'Proyecto nuevo',
    evento_nuevo: 'Evento nuevo de un proyecto',
    evento_cancelado: 'Evento o serie cancelados',
    mantenimiento: 'Aviso de mantenimiento',
};

const SLOT_SENDER: Record<SlotId, SmtpSender> = {
    convocatoria: 'gmail',
    convocatoria_reunion: 'gmail',
    parte_firmas: 'gmail',
    inscripcion: 'noreply',
    cancelacion_inscripcion: 'noreply',
    proyecto_nuevo: 'noreply',
    evento_nuevo: 'noreply',
    evento_cancelado: 'noreply',
    mantenimiento: 'noreply',
};

const EMPTY_SMTP: SmtpConfig = { host: '', port: 587, secure: true };
const EMPTY_NOREPLY_SMTP: NoReplySmtpInput = {
    host: '',
    port: 587,
    secure: true,
    user: '',
    fromName: '',
    password: '',
};

export const EmailSettingsCard = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [smtp, setSmtp] = useState<SmtpConfig>(EMPTY_SMTP);
    const [noReplySmtp, setNoReplySmtp] =
        useState<NoReplySmtpInput>(EMPTY_NOREPLY_SMTP);
    const [assignments, setAssignments] = useState<TemplateAssignment[]>([]);
    const templates = useEmailTemplatesStore((s) => s.items);
    const loadTemplates = useEmailTemplatesStore((s) => s.load);
    const [savingSmtp, setSavingSmtp] = useState(false);
    const [savingNoReplySmtp, setSavingNoReplySmtp] = useState(false);
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
            setNoReplySmtp(
                settings.noReplySmtpConfig
                    ? { ...settings.noReplySmtpConfig, password: '' }
                    : EMPTY_NOREPLY_SMTP,
            );
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

    const handleSmtpSubmit = async (e: SubmitEvent) => {
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

    const handleNoReplySmtpSubmit = async (e: SubmitEvent) => {
        e.preventDefault();
        setSavingNoReplySmtp(true);

        try {
            const { password, ...rest } = noReplySmtp;
            const saved = await updateNoReplySmtpConfig({
                ...rest,
                ...(password && { password }),
            });

            setNoReplySmtp({ ...saved, password: '' });
            toast.success('Configuración guardada.');
        } catch (err) {
            toast.error(
                err instanceof ApiError ? err.message : 'No se pudo guardar',
            );
        } finally {
            setSavingNoReplySmtp(false);
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
        <div className="grid gap-4">
            {error && (
                <Alert variant="destructive">
                    <CircleAlert />
                    <AlertTitle>No se pudo cargar</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <SmtpConfigCard
                    smtp={smtp}
                    onChange={setSmtp}
                    onSubmit={(e) => void handleSmtpSubmit(e)}
                    saving={savingSmtp}
                />

                <TemplateAssignmentCard
                    title="Asignación de plantillas Gmail"
                    description="Qué plantilla usa cada botón enviado por el SMTP de Gmail."
                    sender="gmail"
                    assignments={assignments.filter(
                        ({ slot }) => SLOT_SENDER[slot] === 'gmail',
                    )}
                    slotLabels={SLOT_LABELS}
                    activeTemplates={activeTemplates}
                    savingSlot={savingSlot}
                    onAssignmentChange={(slot, templateId) =>
                        void handleAssignmentChange(slot, templateId)
                    }
                />

                <NoReplySmtpConfigCard
                    noReplySmtp={noReplySmtp}
                    onChange={setNoReplySmtp}
                    onSubmit={(e) => void handleNoReplySmtpSubmit(e)}
                    saving={savingNoReplySmtp}
                />

                <TemplateAssignmentCard
                    title="Asignación de plantillas noreply"
                    description="Qué plantilla usa cada botón enviado por el SMTP noreply."
                    sender="noreply"
                    assignments={assignments.filter(
                        ({ slot }) => SLOT_SENDER[slot] === 'noreply',
                    )}
                    slotLabels={SLOT_LABELS}
                    activeTemplates={activeTemplates}
                    savingSlot={savingSlot}
                    onAssignmentChange={(slot, templateId) =>
                        void handleAssignmentChange(slot, templateId)
                    }
                />
            </div>
        </div>
    );
};
