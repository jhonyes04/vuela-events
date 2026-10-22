import { useEffect, useState } from 'react';
import { FolderOpen } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageTitle } from '@/components/PageTitle';
import { ListErrors } from '@/features/users/components/ListErrors';
import { DataTable } from '@/components/DataTable';
import { ComboboxField } from '@/components/ComboboxField';
import { PaginationControls } from '@/components/PaginationControls';
import { usePagination } from '@/hooks/usePagination';
import { useSort } from '@/hooks/useSort';
import { canManageResource } from '@/lib/ownership';
import { downloadDocument, type Document } from '@/features/resources/lib/documents';
import type { ResourceLink } from '@/features/resources/lib/resourceLinks';
import { useDocumentsStore } from '@/features/resources/documentsStore';
import { useResourceLinksStore } from '@/features/resources/store';
import { DocumentFormDialog } from '@/features/resources/components/DocumentFormDialog';
import { ResourceLinkFormDialog } from '@/features/resources/components/ResourceLinkFormDialog';
import { ResourceDeleteDialog } from '@/features/resources/components/ResourceDeleteDialog';
import { buildResourceColumns } from '@/features/resources/components/resourceColumns';
import {
    KIND_FILTER_LABELS,
    formatSize,
    type KindFilter,
    type Pending,
    type ResourceRow,
    type SortKey,
} from './resourcesTable.types';

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

    const [deleting, setDeleting] = useState<Pending | null>(null);
    const [selected, setSelected] = useState<Set<string>>(new Set());
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
            inUse: doc.inUse,
            createdById: doc.createdById,
            detail: `${doc.fileName} · ${formatSize(doc.size)}`,
            document: doc,
        })),
        ...links.map((link) => ({
            id: link.id,
            kind: 'link' as const,
            title: link.title,
            active: link.active,
            inUse: link.inUse,
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

    const rowKey = (row: ResourceRow) => `${row.kind}-${row.id}`;

    const canDeleteRow = (row: ResourceRow) =>
        canManageResource(
            user,
            row.createdById,
            'resources:delete',
            'resources:delete:own',
        );

    const deletablePaged = paged.filter(
        (row) => canDeleteRow(row) && !row.inUse,
    );
    const allPagedSelected =
        deletablePaged.length > 0 &&
        deletablePaged.every((row) => selected.has(rowKey(row)));

    const toggleAllPaged = () => {
        setSelected((prev) => {
            const next = new Set(prev);

            if (allPagedSelected) {
                deletablePaged.forEach((row) => next.delete(rowKey(row)));
            } else {
                deletablePaged.forEach((row) => next.add(rowKey(row)));
            }

            return next;
        });
    };

    const toggleOne = (key: string) => {
        setSelected((prev) => {
            const next = new Set(prev);

            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }

            return next;
        });
    };

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

    const columns = buildResourceColumns({
        user,
        selected,
        allPagedSelected,
        toggleAllPaged,
        toggleOne,
        rowKey,
        canDeleteRow,
        openEdit,
        view,
        setDeleting,
    });

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
                {selected.size > 0 && (
                    <Button
                        variant="destructive"
                        size="sm"
                        className="ms-auto"
                        onClick={() => {
                            const selectedRows = rows.filter((row) =>
                                selected.has(rowKey(row)),
                            );

                            setDeleting({
                                rows: selectedRows,
                                label:
                                    selectedRows.length === 1
                                        ? 'este recurso'
                                        : `estos ${selectedRows.length} recursos`,
                            });
                        }}
                    >
                        Eliminar seleccionados ({selected.size})
                    </Button>
                )}
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
                        rowKey={rowKey}
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

            <ResourceDeleteDialog
                pending={deleting}
                onOpenChange={(open) => !open && setDeleting(null)}
                onDeleted={({ succeeded }) => {
                    succeeded.forEach((row) => {
                        if (row.kind === 'document') {
                            removeDocument(row.id);
                        } else {
                            removeLink(row.id);
                        }
                    });
                    setSelected((prev) => {
                        const next = new Set(prev);

                        succeeded.forEach((row) => next.delete(rowKey(row)));

                        return next;
                    });
                    setDeleting(null);
                }}
            />
        </section>
    );
};
