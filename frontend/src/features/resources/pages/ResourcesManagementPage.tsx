import { useEffect, useState } from 'react';
import { Eye, FileText, FolderOpen, Link2, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IconTooltip } from '@/components/IconTooltip';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { PageTitle } from '@/components/PageTitle';
import { ListErrors } from '@/features/users/components/ListErrors';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import { ComboboxField } from '@/components/ComboboxField';
import { PaginationControls } from '@/components/PaginationControls';
import { usePagination } from '@/hooks/usePagination';
import { useSort } from '@/hooks/useSort';
import { canManageResource } from '@/lib/ownership';
import {
    deleteDocument,
    downloadDocument,
    type Document,
} from '@/features/resources/lib/documents';
import {
    deleteResourceLink,
    type ResourceLink,
} from '@/features/resources/lib/resourceLinks';
import { useDocumentsStore } from '@/features/resources/documentsStore';
import { useResourceLinksStore } from '@/features/resources/store';
import { DocumentFormDialog } from '@/features/resources/components/DocumentFormDialog';
import { ResourceLinkFormDialog } from '@/features/resources/components/ResourceLinkFormDialog';

type ResourceKind = 'document' | 'link';

interface ResourceRow {
    id: string;
    kind: ResourceKind;
    title: string;
    active: boolean;
    createdById: string | null;
    detail: string;
    document?: Document;
    link?: ResourceLink;
}

type SortKey = 'title' | 'kind';
type KindFilter = '' | ResourceKind;

const KIND_FILTER_LABELS: Record<KindFilter, string> = {
    '': 'Todos los tipos',
    document: 'Documentos',
    link: 'Enlaces',
};

const formatSize = (bytes: number): string =>
    bytes < 1024 * 1024
        ? `${Math.round(bytes / 1024)} KB`
        : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

export const ResourcesManagementPage = () => {
    const { user } = useAuth();
    const canCreate = user?.permissions.includes('resources:create') ?? false;

    const documents = useDocumentsStore((s) => s.items);
    const documentsLoading = useDocumentsStore((s) => s.loading);
    const documentsError = useDocumentsStore((s) => s.error);
    const loadDocuments = useDocumentsStore((s) => s.load);
    const upsertDocument = useDocumentsStore((s) => s.upsert);
    const removeDocument = useDocumentsStore((s) => s.remove);

    const links = useResourceLinksStore((s) => s.items);
    const linksLoading = useResourceLinksStore((s) => s.loading);
    const linksError = useResourceLinksStore((s) => s.error);
    const loadLinks = useResourceLinksStore((s) => s.load);
    const upsertLink = useResourceLinksStore((s) => s.upsert);
    const removeLink = useResourceLinksStore((s) => s.remove);

    const [documentFormOpen, setDocumentFormOpen] = useState(false);
    const [documentFormKey, setDocumentFormKey] = useState(0);
    const [editingDocument, setEditingDocument] = useState<Document | null>(
        null,
    );
    const [kindFilter, setKindFilter] = useState<KindFilter>('');

    const [linkFormOpen, setLinkFormOpen] = useState(false);
    const [linkFormKey, setLinkFormKey] = useState(0);
    const [editingLink, setEditingLink] = useState<ResourceLink | null>(null);

    const [deleting, setDeleting] = useState<ResourceRow | null>(null);
    const [search, setSearch] = useState('');

    const reload = () => {
        void loadDocuments(true);
        void loadLinks(true);
    };

    useEffect(() => {
        reload();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loading = documentsLoading || linksLoading;
    const error = documentsError ?? linksError;

    const rows: ResourceRow[] = [
        ...documents.map((doc) => ({
            id: doc.id,
            kind: 'document' as const,
            title: doc.title,
            active: doc.active,
            createdById: doc.createdById,
            detail: `${doc.fileName} · ${formatSize(doc.size)}`,
            document: doc,
        })),
        ...links.map((link) => ({
            id: link.id,
            kind: 'link' as const,
            title: link.title,
            active: link.active,
            createdById: link.createdById,
            detail: link.url,
            link,
        })),
    ];

    const filtered = rows.filter((row) => {
        if (kindFilter && row.kind !== kindFilter) return false;

        if (!search) return true;

        const q = search.trim().toLowerCase();

        return (
            row.title.toLowerCase().includes(q) ||
            row.detail.toLowerCase().includes(q)
        );
    });

    const { sorted, sort, toggleSort } = useSort<ResourceRow, SortKey>(
        filtered,
        {
            title: (a, b) => a.title.localeCompare(b.title),
            kind: (a, b) => a.kind.localeCompare(b.kind),
        },
        { key: 'title', dir: 'asc' },
    );

    const { paged, page, pageCount, pageSize, total, setPage, setPageSize } =
        usePagination(sorted, 10);

    const openCreateDocument = () => {
        setEditingDocument(null);
        setDocumentFormKey((k) => k + 1);
        setDocumentFormOpen(true);
    };

    const openCreateLink = () => {
        setEditingLink(null);
        setLinkFormKey((k) => k + 1);
        setLinkFormOpen(true);
    };

    const openEdit = (row: ResourceRow) => {
        if (row.kind === 'document' && row.document) {
            setEditingDocument(row.document);
            setDocumentFormKey((k) => k + 1);
            setDocumentFormOpen(true);
        } else if (row.kind === 'link' && row.link) {
            setEditingLink(row.link);
            setLinkFormKey((k) => k + 1);
            setLinkFormOpen(true);
        }
    };

    const view = (row: ResourceRow) => {
        if (row.kind === 'document' && row.document) {
            void downloadDocument(row.document.id, row.document.fileName);
        } else if (row.kind === 'link' && row.link) {
            window.open(row.link.url, '_blank', 'noopener,noreferrer');
        }
    };

    const columns: DataTableColumn<ResourceRow, SortKey>[] = [
        {
            key: 'kind',
            header: 'Tipo',
            sortKey: 'kind',
            cellClassName: 'whitespace-nowrap',
            render: (row) => (
                <Badge
                    variant="outline"
                    className={`${row.kind === 'document' ? 'bg-blue-300' : 'bg-green-300'} gap-1`}
                >
                    {row.kind === 'document' ? (
                        <FileText className="size-3.5" />
                    ) : (
                        <Link2 className="size-3.5" />
                    )}
                    {row.kind === 'document' ? 'Documento' : 'Enlace'}
                </Badge>
            ),
        },
        {
            key: 'title',
            header: 'Título',
            sortKey: 'title',
            render: (row) => (
                <div className="min-w-0">
                    <p className="truncate font-medium">{row.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                        {row.detail}
                    </p>
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Estado',
            render: (row) =>
                row.active ? (
                    <Badge
                        variant="outline"
                        className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    >
                        Activo
                    </Badge>
                ) : (
                    <Badge
                        variant="outline"
                        className="border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"
                    >
                        Inactivo
                    </Badge>
                ),
        },
        {
            key: 'actions',
            header: <span className="sr-only">Acciones</span>,
            align: 'right',
            cellClassName: 'flex justify-end gap-2',
            render: (row) => {
                const canEditRow = canManageResource(
                    user,
                    row.createdById,
                    'resources:edit',
                    'resources:edit:own',
                );
                const canDeleteRow = canManageResource(
                    user,
                    row.createdById,
                    'resources:delete',
                    'resources:delete:own',
                );

                return (
                    <>
                        <IconTooltip label="Ver">
                            <Button
                                variant="secondary"
                                size="icon"
                                aria-label="Ver"
                                onClick={() => view(row)}
                            >
                                <Eye className="size-4" />
                            </Button>
                        </IconTooltip>
                        {canEditRow && (
                            <IconTooltip label="Editar">
                                <Button
                                    variant="secondary"
                                    size="icon"
                                    aria-label="Editar"
                                    onClick={() => openEdit(row)}
                                >
                                    <Pencil className="size-4" />
                                </Button>
                            </IconTooltip>
                        )}
                        {canDeleteRow && (
                            <IconTooltip label="Eliminar">
                                <Button
                                    variant="destructive"
                                    size="icon"
                                    aria-label="Eliminar"
                                    onClick={() => setDeleting(row)}
                                >
                                    <Trash2 className="size-4" />
                                </Button>
                            </IconTooltip>
                        )}
                    </>
                );
            },
        },
    ];

    return (
        <section>
            <div className="mb-4 sm:mb-0 flex flex-wrap items-center justify-between gap-3">
                <PageTitle icon={FolderOpen}>Gestionar Recursos</PageTitle>
                {canCreate && (
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Button
                            variant="secondary"
                            className="w-[calc(50%-0.25rem)] sm:w-auto"
                            onClick={openCreateLink}
                        >
                            Nuevo enlace
                        </Button>
                        <Button
                            className="w-[calc(50%-0.25rem)] sm:w-auto"
                            onClick={openCreateDocument}
                        >
                            Nuevo documento
                        </Button>
                    </div>
                )}
            </div>

            <ListErrors error={error} actionError={null} onRetry={reload} />

            <div className="mb-4 flex flex-wrap items-center gap-2">
                <Input
                    placeholder="Buscar por título…"
                    className="bg-card w-full sm:w-56"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <ComboboxField
                    className="w-full sm:w-40 bg-card"
                    items={['', 'document', 'link'] as KindFilter[]}
                    getValue={(key) => key}
                    getLabel={(key) => KIND_FILTER_LABELS[key]}
                    value={kindFilter}
                    onValueChange={(value) =>
                        setKindFilter(value as KindFilter)
                    }
                    searchable={false}
                    placeholder="Todos los tipos"
                />
            </div>

            {loading ? (
                <p role="status" className="text-muted-foreground">
                    Cargando recursos…
                </p>
            ) : (
                <div className="rounded-xl border bg-card">
                    <DataTable
                        columns={columns}
                        rows={paged}
                        rowKey={(row) => `${row.kind}-${row.id}`}
                        sort={sort}
                        onSort={toggleSort}
                    />
                </div>
            )}

            {!loading && rows.length === 0 && (
                <p className="mt-4 text-muted-foreground">
                    Todavía no hay recursos.
                </p>
            )}

            {!loading && rows.length > 0 && sorted.length === 0 && (
                <p className="mt-4 text-muted-foreground">
                    No hay recursos que coincidan con la búsqueda.
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

            <DocumentFormDialog
                key={`document-${documentFormKey}`}
                open={documentFormOpen}
                onOpenChange={setDocumentFormOpen}
                document={editingDocument}
                onSaved={upsertDocument}
            />

            <ResourceLinkFormDialog
                key={`link-${linkFormKey}`}
                open={linkFormOpen}
                onOpenChange={setLinkFormOpen}
                link={editingLink}
                onSaved={upsertLink}
            />

            {deleting && (
                <ConfirmDeleteDialog
                    open={deleting !== null}
                    onOpenChange={(open) => !open && setDeleting(null)}
                    title={
                        deleting.kind === 'document'
                            ? 'Eliminar documento'
                            : 'Eliminar enlace'
                    }
                    description={`¿Eliminar «${deleting.title}»? Esta acción no se puede deshacer.`}
                    confirmLabel="Eliminar"
                    deletingLabel="Eliminando…"
                    errorFallback="No se pudo eliminar el recurso"
                    successLabel={`«${deleting.title}» eliminado.`}
                    onConfirm={() =>
                        deleting.kind === 'document'
                            ? deleteDocument(deleting.id)
                            : deleteResourceLink(deleting.id)
                    }
                    onDeleted={() => {
                        if (deleting.kind === 'document') {
                            removeDocument(deleting.id);
                        } else {
                            removeLink(deleting.id);
                        }
                        setDeleting(null);
                    }}
                />
            )}
        </section>
    );
};
