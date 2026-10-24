import { useEffect, useState } from 'react';
import { Download, FileText, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { IconTooltip } from '@/components/IconTooltip';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { ListErrors } from '@/features/users/components/ListErrors';
import { DocumentFormDialog } from '@/features/resources/components/DocumentFormDialog';
import {
    deleteDocument,
    downloadDocument,
    type Document,
} from '@/features/resources/lib/documents';
import { useDocumentsStore } from '@/features/resources/documentsStore';
import { canManageResource } from '@/lib/ownership';

const formatSize = (bytes: number): string =>
    bytes < 1024 * 1024
        ? `${Math.round(bytes / 1024)} KB`
        : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

interface DocumentsTabProps {
    search: string;
}

export const DocumentsTab = ({ search }: DocumentsTabProps) => {
    const { user } = useAuth();
    const canCreate = user?.permissions.includes('resources:create') ?? false;
    const canManageAny =
        canCreate ||
        (user?.permissions.some((p) =>
            [
                'resources:edit',
                'resources:edit:own',
                'resources:delete',
                'resources:delete:own',
            ].includes(p),
        ) ??
            false);
    const documents = useDocumentsStore((s) => s.items);
    const loading = useDocumentsStore((s) => s.loading);
    const error = useDocumentsStore((s) => s.error);
    const load = useDocumentsStore((s) => s.load);
    const upsert = useDocumentsStore((s) => s.upsert);
    const remove = useDocumentsStore((s) => s.remove);
    const [formOpen, setFormOpen] = useState(false);
    const [formKey, setFormKey] = useState(0);
    const [editing, setEditing] = useState<Document | null>(null);
    const [deleting, setDeleting] = useState<Document | null>(null);

    useEffect(() => {
        void load(true);
    }, [load]);

    const openCreate = () => {
        setEditing(null);
        setFormKey((k) => k + 1);
        setFormOpen(true);
    };

    const openEdit = (doc: Document) => {
        setEditing(doc);
        setFormKey((k) => k + 1);
        setFormOpen(true);
    };

    const visibleDocuments = (
        canManageAny ? documents : documents.filter((d) => d.active)
    ).filter((d) => {
        if (!search) return true;

        const q = search.trim().toLowerCase();

        return (
            d.title.toLowerCase().includes(q) ||
            d.fileName.toLowerCase().includes(q)
        );
    });

    return (
        <div>
            <div className="mb-4 flex flex-wrap items-center justify-end gap-3">
                {canCreate && (
                    <Button onClick={openCreate}>Nuevo documento</Button>
                )}
            </div>

            <ListErrors
                error={error}
                actionError={null}
                onRetry={() => void load(true)}
            />

            {loading ? (
                <p role="status" className="text-muted-foreground">
                    Cargando documentos…
                </p>
            ) : visibleDocuments.length === 0 ? (
                <p className="text-muted-foreground">
                    Todavía no hay documentos.
                </p>
            ) : (
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {visibleDocuments.map((document) => {
                        const canEditDoc = canManageResource(
                            user,
                            document.createdById,
                            'resources:edit',
                            'resources:edit:own',
                        );
                        const canDeleteDoc = canManageResource(
                            user,
                            document.createdById,
                            'resources:delete',
                            'resources:delete:own',
                        );

                        return (
                            <li
                                key={document.id}
                                className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center"
                            >
                                <div className="flex min-w-0 flex-1 items-start gap-3">
                                    <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-medium">
                                            {document.title}
                                        </p>
                                        <p className="truncate text-sm text-muted-foreground">
                                            {document.fileName} ·{' '}
                                            {formatSize(document.size)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                                    {!document.active && (
                                        <Badge variant="secondary">
                                            Inactivo
                                        </Badge>
                                    )}
                                    <IconTooltip label="Descargar">
                                        <Button
                                            variant="default"
                                            size="icon"
                                            aria-label="Descargar"
                                            onClick={() =>
                                                void downloadDocument(
                                                    document.id,
                                                    document.fileName,
                                                )
                                            }
                                        >
                                            <Download className="size-4" />
                                        </Button>
                                    </IconTooltip>
                                    {canEditDoc && (
                                        <IconTooltip label="Editar">
                                            <Button
                                                variant="secondary"
                                                size="icon"
                                                aria-label="Editar"
                                                onClick={() =>
                                                    openEdit(document)
                                                }
                                            >
                                                <Pencil className="size-4" />
                                            </Button>
                                        </IconTooltip>
                                    )}
                                    {canDeleteDoc && (
                                        <IconTooltip label="Eliminar">
                                            <Button
                                                variant="destructive"
                                                size="icon"
                                                disabled={document.inUse}
                                                aria-label="Eliminar"
                                                onClick={() =>
                                                    setDeleting(document)
                                                }
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </IconTooltip>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}

            {canManageAny && (
                <DocumentFormDialog
                    key={formKey}
                    open={formOpen}
                    onOpenChange={setFormOpen}
                    document={editing}
                    onSaved={upsert}
                />
            )}

            {deleting && (
                <ConfirmDeleteDialog
                    open={deleting !== null}
                    onOpenChange={(open) => !open && setDeleting(null)}
                    title="Eliminar documento"
                    description={`¿Eliminar «${deleting.title}»?`}
                    confirmLabel="Eliminar"
                    deletingLabel="Eliminando…"
                    errorFallback="No se pudo eliminar el documento"
                    successLabel={`Documento «${deleting.title}» eliminado.`}
                    onConfirm={() => deleteDocument(deleting.id)}
                    onDeleted={() => {
                        remove(deleting.id);
                        setDeleting(null);
                    }}
                />
            )}
        </div>
    );
};
