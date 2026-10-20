import { useEffect, useState } from 'react';
import { Mail, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IconTooltip } from '@/components/IconTooltip';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { PageTitle } from '@/components/PageTitle';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import { PaginationControls } from '@/components/PaginationControls';
import { usePagination } from '@/hooks/usePagination';
import { useSort } from '@/hooks/useSort';
import { useAuth } from '@/features/auth/hooks/context';
import { ListErrors } from '@/features/users/components/ListErrors';
import { EmailTemplateFormDialog } from '@/features/emailTemplates/components/EmailTemplateFormDialog';
import {
    deleteEmailTemplate,
    type EmailTemplate,
} from '@/features/emailTemplates/lib/emailTemplates';
import { useEmailTemplatesStore } from '@/features/emailTemplates/store';
import { stripHtml } from '@/lib/html';

type SortKey = 'name' | 'subject' | 'active' | 'category';

const CATEGORY_LABELS: Record<EmailTemplate['category'], string> = {
    dinamizacion: 'Dinamización',
    administracion: 'Administración',
};

const CATEGORY_BADGE_CLASS: Record<EmailTemplate['category'], string> = {
    dinamizacion: 'border-yellow-300/80 bg-yellow-300/50 text-black',
    administracion: 'border-red-500/30 bg-red-500/10 text-red-600',
};

export const EmailTemplatesPage = () => {
    const { user } = useAuth();
    const templates = useEmailTemplatesStore((s) => s.items);
    const loading = useEmailTemplatesStore((s) => s.loading);
    const error = useEmailTemplatesStore((s) => s.error);
    const load = useEmailTemplatesStore((s) => s.load);
    const upsert = useEmailTemplatesStore((s) => s.upsert);
    const remove = useEmailTemplatesStore((s) => s.remove);
    const [search, setSearch] = useState('');
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<EmailTemplate | null>(null);
    const [deleting, setDeleting] = useState<EmailTemplate | null>(null);

    // Al entrar se refresca, pero la lista en caché se ve mientras tanto.
    useEffect(() => {
        void load(true);
    }, [load]);

    const canDelete = user?.permissions.includes('email:delete') ?? false;

    const openCreate = () => {
        setEditing(null);
        setFormOpen(true);
    };

    const openEdit = (template: EmailTemplate) => {
        setEditing(template);
        setFormOpen(true);
    };

    const query = search.trim().toLowerCase();
    const filtered = query
        ? templates.filter(
              (t) =>
                  t.name.toLowerCase().includes(query) ||
                  stripHtml(t.subject).toLowerCase().includes(query),
          )
        : templates;

    const { sorted, sort, toggleSort } = useSort<EmailTemplate, SortKey>(
        filtered,
        {
            name: (a, b) => a.name.localeCompare(b.name),
            subject: (a, b) =>
                stripHtml(a.subject).localeCompare(stripHtml(b.subject)),
            active: (a, b) => Number(a.active) - Number(b.active),
            category: (a, b) =>
                CATEGORY_LABELS[a.category].localeCompare(
                    CATEGORY_LABELS[b.category],
                ),
        },
        { key: 'name', dir: 'asc' },
    );

    const { paged, page, pageCount, pageSize, total, setPage, setPageSize } =
        usePagination(sorted, 10);

    const columns: DataTableColumn<EmailTemplate, SortKey>[] = [
        {
            key: 'name',
            header: 'Nombre',
            sortKey: 'name',
            render: (template) => template.name,
        },
        {
            key: 'subject',
            header: 'Asunto',
            sortKey: 'subject',
            render: (template) => (
                <span className="text-muted-foreground">
                    {stripHtml(template.subject)}
                </span>
            ),
        },
        {
            key: 'active',
            header: 'Estado',
            sortKey: 'active',
            render: (template) =>
                template.active ? (
                    <Badge
                        variant="outline"
                        className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    >
                        Activa
                    </Badge>
                ) : (
                    <Badge
                        variant="outline"
                        className="border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"
                    >
                        Inactiva
                    </Badge>
                ),
        },
        {
            key: 'category',
            header: 'Categoría',
            sortKey: 'category',
            render: (template) => (
                <Badge
                    variant="outline"
                    className={CATEGORY_BADGE_CLASS[template.category]}
                >
                    {CATEGORY_LABELS[template.category]}
                </Badge>
            ),
        },
        {
            key: 'actions',
            header: <span className="sr-only">Acciones</span>,
            align: 'right',
            cellClassName: 'flex justify-end gap-2',
            render: (template) => (
                <>
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
                    {canDelete && (
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
                    )}
                </>
            ),
        },
    ];

    return (
        <section>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <PageTitle icon={Mail} className="mb-0">
                    Gestionar Plantillas de correo
                </PageTitle>
                <Button onClick={openCreate}>Nueva plantilla</Button>
            </div>

            <div className="mb-4">
                <Input
                    placeholder="Buscar por nombre o asunto…"
                    className="bg-card w-64"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
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
            ) : (
                <div className="rounded-xl border bg-card">
                    <DataTable
                        columns={columns}
                        rows={paged}
                        rowKey={(template) => template.id}
                        sort={sort}
                        onSort={toggleSort}
                    />
                </div>
            )}

            {!loading && paged.length === 0 && (
                <p className="mt-4 text-muted-foreground">
                    {query
                        ? 'No hay plantillas que coincidan con la búsqueda.'
                        : 'Todavía no hay plantillas.'}
                </p>
            )}

            {!loading && total > 0 && (
                <div className="mt-4">
                    <PaginationControls
                        page={page}
                        pageCount={pageCount}
                        pageSize={pageSize}
                        total={total}
                        onPageChange={setPage}
                        onPageSizeChange={setPageSize}
                    />
                </div>
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
