import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/RichTextEditor';
import { DateTimePicker } from '@/features/datetime/components/DateTimePicker';
import { formatDateKey } from '@/features/datetime/lib/dateMask';
import { useAuth } from '@/features/auth/hooks/context';
import { ApiError } from '@/lib/api';
import { stripHtml } from '@/lib/html';
import {
    getMaintenanceNoticeJobStatus,
    startMaintenanceNotice,
    type MaintenanceNoticeJobStatus,
} from '@/features/appSettings/lib/appSettings';
import { MaintenanceNoticeProgress } from '@/features/appSettings/components/MaintenanceNoticeProgress';

const POLL_MS = 2000;

// 'YYYY-MM-DDTHH:mm', lo que espera DateTimePicker.
const nowDateTimeValue = (): string => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    return `${formatDateKey(now)}T${hours}:${minutes}`;
};

export const MaintenanceNoticeCard = () => {
    const { user } = useAuth();
    const [from, setFrom] = useState(nowDateTimeValue);
    const [to, setTo] = useState(nowDateTimeValue);
    const [reason, setReason] = useState('');
    const [formKey, setFormKey] = useState(0);
    const [status, setStatus] = useState<MaintenanceNoticeJobStatus | null>(
        null,
    );
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, []);

    if (!user?.isSuperadmin) return null;

    const poll = (jobId: string) => {
        pollRef.current = setInterval(() => {
            void getMaintenanceNoticeJobStatus(jobId).then((job) => {
                setStatus(job);

                if (job.done && pollRef.current) {
                    clearInterval(pollRef.current);
                }
            });
        }, POLL_MS);
    };

    const handleSubmit = async (e: SubmitEvent) => {
        e.preventDefault();

        if (!from || !to || !stripHtml(reason)) {
            toast.error('Rellena inicio, fin y motivo.');
            return;
        }

        try {
            const jobId = await startMaintenanceNotice({
                from: new Date(from).toISOString(),
                to: new Date(to).toISOString(),
                reason,
            });

            setStatus({
                id: jobId,
                total: 0,
                sent: 0,
                failed: 0,
                done: false,
                recipients: [],
                results: [],
            });
            poll(jobId);
        } catch (err) {
            toast.error(
                err instanceof ApiError
                    ? err.message
                    : 'No se pudo enviar el aviso',
            );
        }
    };

    const handleCloseProgress = () => {
        setStatus(null);
        setFrom(nowDateTimeValue());
        setTo(nowDateTimeValue());
        setReason('');
        setFormKey((k) => k + 1);
    };

    return (
        <div className="grid gap-4 rounded-xl border bg-card p-4 sm:p-6">
            <div className="grid gap-1">
                <h2 className="text-sm font-medium">Avisar mantenimiento</h2>
                <p className="text-sm text-muted-foreground">
                    Envía un correo a todos los usuarios activos avisando del
                    periodo de mantenimiento. No activa el modo mantenimiento
                    por sí solo.
                </p>
            </div>

            <form
                id="maintenance-notice-form"
                onSubmit={(e) => void handleSubmit(e)}
                className="grid gap-4"
            >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                        <Label htmlFor="notice-from">Inicio *</Label>
                        <DateTimePicker
                            id="notice-from"
                            value={from}
                            onChange={setFrom}
                        />
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="notice-to">Fin *</Label>
                        <DateTimePicker
                            id="notice-to"
                            value={to}
                            onChange={setTo}
                        />
                    </div>
                </div>

                <div className="grid gap-1.5">
                    <Label htmlFor="notice-reason">Motivo *</Label>
                    <RichTextEditor
                        key={formKey}
                        value={reason}
                        onChange={setReason}
                        contentClassName="min-h-32"
                    />
                </div>
            </form>

            <div className="flex justify-end">
                <Button
                    type="submit"
                    form="maintenance-notice-form"
                    disabled={status !== null && !status.done}
                >
                    {status !== null && !status.done
                        ? 'Enviando…'
                        : 'Enviar aviso'}
                </Button>
            </div>

            {status && (
                <MaintenanceNoticeProgress
                    status={status}
                    onClose={handleCloseProgress}
                />
            )}
        </div>
    );
};
