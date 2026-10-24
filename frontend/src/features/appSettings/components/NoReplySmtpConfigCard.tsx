import type { SubmitEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { NoReplySmtpInput } from '@/features/appSettings/lib/emailSettings';
import { SenderBadge } from './SenderBadge';

interface NoReplySmtpConfigCardProps {
    noReplySmtp: NoReplySmtpInput;
    onChange: (noReplySmtp: NoReplySmtpInput) => void;
    onSubmit: (e: SubmitEvent) => void;
    saving: boolean;
}

export const NoReplySmtpConfigCard = ({
    noReplySmtp,
    onChange,
    onSubmit,
    saving,
}: NoReplySmtpConfigCardProps) => (
    <div className="rounded-xl border bg-card p-4">
        <div className="mb-4 flex items-center gap-2">
            <h2 className="font-medium">Servidor SMTP (noreply)</h2>
            <SenderBadge sender="noreply" />
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
            Cuenta propia del sistema (noreply@vuelaevents.es), usada para los
            avisos automáticos. Usuario y contraseña se guardan aquí,
            cifrados.
        </p>

        <form
            id="noreply-smtp-form"
            onSubmit={onSubmit}
            className="grid gap-4"
        >
            <div className="grid gap-1.5">
                <Label htmlFor="noreply-host">Servidor *</Label>
                <Input
                    id="noreply-host"
                    required
                    maxLength={255}
                    placeholder="smtp.vuelaevents.es"
                    value={noReplySmtp.host}
                    onChange={(e) =>
                        onChange({ ...noReplySmtp, host: e.target.value })
                    }
                />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                    <Label htmlFor="noreply-port">Puerto *</Label>
                    <Input
                        id="noreply-port"
                        type="number"
                        required
                        min={1}
                        max={65535}
                        value={noReplySmtp.port}
                        onChange={(e) =>
                            onChange({
                                ...noReplySmtp,
                                port: Number(e.target.value),
                            })
                        }
                    />
                </div>

                <label className="flex items-end gap-2 pb-2 text-sm">
                    <Checkbox
                        checked={noReplySmtp.secure}
                        onCheckedChange={(checked) =>
                            onChange({ ...noReplySmtp, secure: checked })
                        }
                    />
                    TLS
                </label>
            </div>

            <div className="grid gap-1.5">
                <Label htmlFor="noreply-user">Usuario *</Label>
                <Input
                    id="noreply-user"
                    required
                    maxLength={255}
                    placeholder="noreply@vuelaevents.es"
                    value={noReplySmtp.user}
                    onChange={(e) =>
                        onChange({ ...noReplySmtp, user: e.target.value })
                    }
                />
            </div>

            <div className="grid gap-1.5">
                <Label htmlFor="noreply-password">Contraseña</Label>
                <Input
                    id="noreply-password"
                    type="password"
                    autoComplete="new-password"
                    placeholder={
                        noReplySmtp.user
                            ? 'Dejar vacío para no cambiarla'
                            : undefined
                    }
                    value={noReplySmtp.password}
                    onChange={(e) =>
                        onChange({ ...noReplySmtp, password: e.target.value })
                    }
                />
            </div>

            <div className="grid gap-1.5">
                <Label htmlFor="noreply-from-name">
                    Nombre del remitente *
                </Label>
                <Input
                    id="noreply-from-name"
                    required
                    maxLength={100}
                    placeholder="Vuela Events"
                    value={noReplySmtp.fromName}
                    onChange={(e) =>
                        onChange({ ...noReplySmtp, fromName: e.target.value })
                    }
                />
            </div>
        </form>

        <div className="mt-4 flex justify-end">
            <Button type="submit" form="noreply-smtp-form" disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar'}
            </Button>
        </div>
    </div>
);
