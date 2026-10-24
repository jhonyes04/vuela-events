import type { SubmitEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { SmtpConfig } from '@/features/appSettings/lib/emailSettings';
import { SenderBadge } from './SenderBadge';

interface SmtpConfigCardProps {
    smtp: SmtpConfig;
    onChange: (smtp: SmtpConfig) => void;
    onSubmit: (e: SubmitEvent) => void;
    saving: boolean;
}

export const SmtpConfigCard = ({
    smtp,
    onChange,
    onSubmit,
    saving,
}: SmtpConfigCardProps) => (
    <div className="rounded-xl border bg-card p-4">
        <div className="mb-4 flex items-center gap-2">
            <h2 className="font-medium">Servidor SMTP</h2>
            <SenderBadge sender="gmail" />
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
            Sin usuario ni contraseña: se piden justo antes de enviar, nunca se
            guardan.
        </p>

        <form id="smtp-form" onSubmit={onSubmit} className="grid gap-4">
            <div className="grid gap-1.5">
                <Label htmlFor="smtp-host">Servidor *</Label>
                <Input
                    id="smtp-host"
                    required
                    maxLength={255}
                    placeholder="smtp.gmail.com"
                    value={smtp.host}
                    onChange={(e) =>
                        onChange({ ...smtp, host: e.target.value })
                    }
                />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                            onChange({ ...smtp, port: Number(e.target.value) })
                        }
                    />
                </div>

                <label className="flex items-end gap-2 pb-2 text-sm">
                    <Checkbox
                        checked={smtp.secure}
                        onCheckedChange={(checked) =>
                            onChange({ ...smtp, secure: checked })
                        }
                    />
                    TLS
                </label>
            </div>
        </form>

        <div className="mt-4 flex justify-end">
            <Button type="submit" form="smtp-form" disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar'}
            </Button>
        </div>
    </div>
);
