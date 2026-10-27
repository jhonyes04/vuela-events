import { useEffect } from 'react';
import { Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IconTooltip } from '@/components/IconTooltip';
import { ListErrors } from '@/features/users/components/ListErrors';
import { downloadDocument } from '@/features/resources/lib/documents';
import { useDocumentsStore } from '@/features/resources/documentsStore';

const formatSize = (bytes: number): string =>
    bytes < 1024 * 1024
        ? `${Math.round(bytes / 1024)} KB`
        : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

interface DocumentsTabProps {
    search: string;
}

export const DocumentsTab = ({ search }: DocumentsTabProps) => {
    const documents = useDocumentsStore((s) => s.items);
    const loading = useDocumentsStore((s) => s.loading);
    const error = useDocumentsStore((s) => s.error);
    const load = useDocumentsStore((s) => s.load);

    useEffect(() => {
        void load(true);
    }, [load]);

    const visibleDocuments = documents.filter((d) => d.active).filter((d) => {
        if (!search) return true;

        const q = search.trim().toLowerCase();

        return (
            d.title.toLowerCase().includes(q) ||
            d.fileName.toLowerCase().includes(q)
        );
    });

    return (
        <div>
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
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};
