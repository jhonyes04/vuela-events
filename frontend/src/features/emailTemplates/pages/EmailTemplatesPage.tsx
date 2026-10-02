import { useEffect, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { IconTooltip } from '@/components/IconTooltip';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { ListErrors } from '@/features/users/components/ListErrors';
import { EmailTemplateFormDialog } from '@/features/emailTemplates/components/EmailTemplateFormDialog';
import {
    deleteEmailTemplate,
    type EmailTemplate,
} from '@/features/emailTemplates/lib/emailTemplates';
import { useEmailTemplatesStore } from '@/features/emailTemplates/store';

export const EmailTemplatesPage = () => {
    const templates = useEmailTemplatesStore((s) => s.items);
    const loading = useEmailTemplatesStore((s) => s.loading);
    const error = useEmailTemplatesStore((s) => s.error);
    const load = useEmailTemplatesStore((s) => s.load);
    const upsert = useEmailTemplatesStore((s) => s.upsert);
    const remove = useEmailTemplatesStore((s) => s.remove);
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<EmailTemplate | null>(null);
    const [deleting, setDeleting] = useState<EmailTemplate | null>(null);

    // Al entrar se refresca, pero la lista en caché se ve mientras tanto.
    useEffect(() => {
        void load(true);
    }, [load]);

    const openCreate = () => {
        setEditing(null);
        setFormOpen(true);
    };

    const openEdit = (template: EmailTemplate) => {
        setEditing(template);
        setFormOpen(true);
    };

    return (
        <section>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-semibold">Plantillas de correo</h1>
                <Button onClick={openCreate}>Nueva plantilla</Button>
            </div>

            <ListErrors
                error={error}
                actionError={null}
                onRetry={() => void load(true)}
            />

            {loading ? (
                <p role="status" className="text-muted-foreground">
                    Cargando plantillas…
                </p>
            ) : templates.length === 0 ? (
                <p className="text-muted-foreground">
                    Todavía no hay plantillas.
                </p>
            ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                    {templates.map((template) => (
                        <li
                            key={template.id}
                            className="flex items-center gap-3 rounded-xl border bg-card p-4"
                        >
                            <div className="min-w-0 flex-1">
                                <p className="truncate font-medium">
                                    {template.name}
                                </p>
                                <p className="truncate text-sm text-muted-foreground">
                                    {template.subject}
                                </p>
                            </div>
                            {!template.active && (
                                <Badge variant="secondary">Inactiva</Badge>
                            )}
                            <IconTooltip label="Editar">
                                <Button
                                    variant="secondary"
                                    size="icon"
                                    aria-label="Editar"
                                    onClick={() => openEdit(template)}
                                >
                                    <Pencil className="size-4" />
                                </Button>
                            </IconTooltip>
                            <IconTooltip label="Eliminar">
                                <Button
                                    variant="destructive"
                                    size="icon"
                                    aria-label="Eliminar"
                                    onClick={() => setDeleting(template)}
                                >
                                    <Trash2 className="size-4" />
                                </Button>
                            </IconTooltip>
                        </li>
                    ))}
                </ul>
            )}

            <EmailTemplateFormDialog
                open={formOpen}
                onOpenChange={setFormOpen}
                template={editing}
                onSaved={upsert}
            />

            {deleting && (
                <ConfirmDeleteDialog
                    open={deleting !== null}
                    onOpenChange={(open) => !open && setDeleting(null)}
                    title="Eliminar plantilla"
                    description={`¿Eliminar «${deleting.name}»? Esta acción no se puede deshacer.`}
                    confirmLabel="Eliminar"
                    deletingLabel="Eliminando…"
                    errorFallback="No se pudo eliminar la plantilla"
                    successLabel={`Plantilla «${deleting.name}» eliminada.`}
                    onConfirm={() => deleteEmailTemplate(deleting.id)}
                    onDeleted={() => {
                        remove(deleting.id);
                        setDeleting(null);
                    }}
                />
            )}
        </section>
    );
};
