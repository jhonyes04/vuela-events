import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    // DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    RichTextEditor,
    type EditorPlaceholder,
} from '@/components/RichTextEditor';
import { ApiError } from '@/lib/api';
import {
    createEmailTemplate,
    updateEmailTemplate,
    type EmailTemplate,
} from '@/features/emailTemplates/lib/emailTemplates';

const EVENT_PLACEHOLDERS: EditorPlaceholder[] = [
    { token: '{{saludo}}', label: 'Saludo' },
    { token: '{{fecha}}', label: 'Fecha' },
    { token: '{{horaInicio}}', label: 'Hora de inicio' },
    { token: '{{horaFin}}', label: 'Hora de fin' },
    { token: '{{lugar}}', label: 'Lugar' },
    { token: '{{proyecto}}', label: 'Proyecto' },
];

interface EmailTemplateFormBodyProps {
    template: EmailTemplate | null;
    onSaved: (template: EmailTemplate) => void;
    onClose: () => void;
}

const EmailTemplateFormBody = ({
    template,
    onSaved,
    onClose,
}: EmailTemplateFormBodyProps) => {
    const [name, setName] = useState(template?.name ?? '');
    const [subject, setSubject] = useState(template?.subject ?? '');
    const [body, setBody] = useState(template?.body ?? '');
    const [active, setActive] = useState(template?.active ?? true);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const saved = template
                ? await updateEmailTemplate(template.id, {
                      name,
                      subject,
                      body,
                      active,
                  })
                : await createEmailTemplate({ name, subject, body });

            toast.success(
                template ? 'Plantilla actualizada.' : 'Plantilla creada.',
            );
            onSaved(saved);
            onClose();
        } catch (error) {
            toast.error(
                error instanceof ApiError
                    ? error.message
                    : 'No se pudo guardar la plantilla',
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
                <DialogTitle>
                    {template ? 'Editar plantilla' : 'Nueva plantilla'}
                </DialogTitle>
                {/* <DialogDescription>
                    Puedes usar {'{{saludo}}'}, {'{{fecha}}'},{' '}
                    {'{{horaInicio}}'}, {'{{horaFin}}'}, {'{{lugar}}'} y{' '}
                    {'{{proyecto}}'} en el asunto o el cuerpo: se sustituyen por
                    los datos del evento al enviar.
                </DialogDescription> */}
            </DialogHeader>

            <form
                id="email-template-form"
                onSubmit={(e) => void handleSubmit(e)}
                className="grid gap-4"
            >
                <div className="grid gap-1.5">
                    <Label htmlFor="email-template-name">Nombre *</Label>
                    <Input
                        id="email-template-name"
                        required
                        minLength={2}
                        maxLength={100}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Nombre de la plantilla..."
                    />
                </div>

                <div className="grid gap-1.5">
                    <Label htmlFor="email-template-subject">Asunto *</Label>
                    <Input
                        id="email-template-subject"
                        required
                        minLength={2}
                        maxLength={200}
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                    />
                </div>

                <div className="grid gap-1.5">
                    <Label htmlFor="email-template-body">Cuerpo *</Label>
                    <RichTextEditor
                        value={body}
                        onChange={setBody}
                        placeholders={EVENT_PLACEHOLDERS}
                    />
                </div>

                {template && (
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            className="size-4 accent-primary"
                            checked={active}
                            onChange={(e) => setActive(e.target.checked)}
                        />
                        Activa
                    </label>
                )}

            </form>

            <DialogFooter>
                <Button
                    type="submit"
                    form="email-template-form"
                    disabled={submitting}
                >
                    {submitting ? 'Guardando…' : 'Guardar'}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
};

interface EmailTemplateFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    // null = crear, plantilla = editar.
    template: EmailTemplate | null;
    onSaved: (template: EmailTemplate) => void;
}

export const EmailTemplateFormDialog = ({
    open,
    onOpenChange,
    template,
    onSaved,
}: EmailTemplateFormDialogProps) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <EmailTemplateFormBody
            key={template?.id ?? 'new'}
            template={template}
            onSaved={onSaved}
            onClose={() => onOpenChange(false)}
        />
    </Dialog>
);
