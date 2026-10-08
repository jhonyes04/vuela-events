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

const formatSize = (bytes: number): string =>
    bytes < 1024 * 1024
        ? `${Math.round(bytes / 1024)} KB`
        : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

export const DocumentsTab = () => {
    const { user } = useAuth();
    const canManage = user?.permissions.includes('resources:create') ?? false;
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

    const visibleDocuments = canManage
        ? documents
        : documents.filter((d) => d.active);

    return (
        <div>
            <div className="mb-4 flex flex-wrap items-center justify-end gap-3">
                {canManage && (
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
                <ul className="grid gap-3 sm:grid-cols-2">
                    {visibleDocuments.map((doc) => (
                        <li
                            key={doc.id}
                            className="flex items-center gap-3 rounded-xl border bg-card p-4"
                        >
                            <FileText className="size-4 shrink-0 text-muted-foreground" />
                            <div className="min-w-0 flex-1">
                                <p className="truncate font-medium">
                                    {doc.title}
                                </p>
                                <p className="truncate text-sm text-muted-foreground">
                                    {doc.fileName} · {formatSize(doc.size)}
                                </p>
                            </div>
                            {!doc.active && (
                                <Badge variant="secondary">Inactivo</Badge>
                            )}
                            <IconTooltip label="Descargar">
                                <Button
                                    variant="secondary"
                                    size="icon"
                                    aria-label="Descargar"
                                    onClick={() =>
                                        void downloadDocument(
                                            doc.id,
                                            doc.fileName,
                                        )
                                    }
                                >
                                    <Download className="size-4" />
                                </Button>
                            </IconTooltip>
                            {canManage && (
                                <>
                                    <IconTooltip label="Editar">
                                        <Button
                                            variant="secondary"
                                            size="icon"
                                            aria-label="Editar"
                                            onClick={() => openEdit(doc)}
                                        >
                                            <Pencil className="size-4" />
                                        </Button>
                                    </IconTooltip>
                                    <IconTooltip label="Eliminar">
                                        <Button
                                            variant="destructive"
                                            size="icon"
                                            aria-label="Eliminar"
                                            onClick={() => setDeleting(doc)}
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    </IconTooltip>
                                </>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            {canManage && (
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
                    description={`¿Eliminar «${deleting.title}»? Esta acción no se puede deshacer.`}
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
