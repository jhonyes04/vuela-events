import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
    RichTextEditor,
    type EditorPlaceholder,
} from '@/components/RichTextEditor';
import { useAuth } from '@/features/auth/hooks/context';
import { ApiError } from '@/lib/api';
import {
    createEmailTemplate,
    updateEmailTemplate,
    type EmailTemplate,
    type EmailTemplateCategory,
} from '@/features/emailTemplates/lib/emailTemplates';

const EVENT_PLACEHOLDERS: EditorPlaceholder[] = [
    { token: '{{saludo}}', label: 'Saludo' },
    { token: '{{fecha}}', label: 'Fecha' },
    { token: '{{horaInicio}}', label: 'Hora inicio' },
    { token: '{{horaFin}}', label: 'Hora fin' },
    { token: '{{lugar}}', label: 'Lugar' },
    { token: '{{proyecto}}', label: 'Proyecto' },
    { token: '{{evento}}', label: 'Evento' },
    { token: '{{fechas}}', label: 'Fecha(s)' },
    { token: '{{calendarUrl}}', label: 'Enlace Google Calendar' },
    { token: '{{enlacePerfil}}', label: 'Enlace perfil' },
    { token: '{{motivo}}', label: 'Motivo' },
];

const MAINTENANCE_PLACEHOLDERS: EditorPlaceholder[] = [
    { token: '{{desde}}', label: 'Desde' },
    { token: '{{hasta}}', label: 'Hasta' },
];

const CATEGORY_OPTIONS: { value: EmailTemplateCategory; label: string }[] = [
    { value: 'dinamizacion', label: 'Dinamización' },
    { value: 'administracion', label: 'Administración' },
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
    const [category, setCategory] = useState<EmailTemplateCategory>(
        template?.category ?? 'administracion',
    );
    const [submitting, setSubmitting] = useState(false);
    const { user } = useAuth();
    const isAdmin = user?.roleId === 'admin';
    const placeholders = isAdmin
        ? [...EVENT_PLACEHOLDERS, ...MAINTENANCE_PLACEHOLDERS]
        : EVENT_PLACEHOLDERS;

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
                      ...(isAdmin && { category }),
                  })
                : await createEmailTemplate({
                      name,
                      subject,
                      body,
                      ...(isAdmin && { category }),
                  });

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
        <DialogContent className="sm:max-w-3xl">
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

                {isAdmin && (
                    <div className="grid gap-1.5">
                        <Label>Categoría</Label>
                        <RadioGroup
                            className="flex flex-wrap gap-4"
                            value={category}
                            onValueChange={(value) =>
                                setCategory(value as EmailTemplateCategory)
                            }
                        >
                            {CATEGORY_OPTIONS.map((option) => (
                                <div
                                    key={option.value}
                                    className="flex items-center gap-2"
                                >
                                    <RadioGroupItem
                                        id={`email-template-category-${option.value}`}
                                        value={option.value}
                                    />
                                    <Label
                                        htmlFor={`email-template-category-${option.value}`}
                                    >
                                        {option.label}
                                    </Label>
                                </div>
                            ))}
                        </RadioGroup>
                    </div>
                )}

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
                        placeholders={placeholders}
                    />
                </div>

                {template && (
                    <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                            checked={active}
                            disabled={submitting}
                            onCheckedChange={setActive}
                        />
                        {active ? 'Activa' : 'Desactivada'}
                    </label>
                )}
            </form>

            <DialogFooter>
                <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={submitting}
                >
                    Cancelar
                </Button>
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
        {open && (
            <EmailTemplateFormBody
                key={template?.id ?? 'new'}
                template={template}
                onSaved={onSaved}
                onClose={() => onOpenChange(false)}
            />
        )}
    </Dialog>
);
