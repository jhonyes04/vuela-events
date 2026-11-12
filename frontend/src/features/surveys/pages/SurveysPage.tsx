import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
    BarChart3,
    ClipboardList,
    Pencil,
    Play,
    Square,
    Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { IconTooltip } from '@/components/IconTooltip';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { PageTitle } from '@/components/PageTitle';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import { ListErrors } from '@/features/users/components/ListErrors';
import { ComboboxField } from '@/components/ComboboxField';
import { SearchInput } from '@/components/SearchInput';
import { PaginationControls } from '@/components/PaginationControls';
import { useSort } from '@/hooks/useSort';
import { usePagination } from '@/hooks/usePagination';
import { useNotificationStream } from '@/features/notifications/hooks/useNotificationStream';
import { SurveyFormDialog } from '@/features/surveys/components/SurveyFormDialog';
import { SurveyResultsDialog } from '@/features/surveys/components/SurveyResultsDialog';
import {
    activateSurvey,
    closeSurvey,
    deleteSurvey,
    getSurvey,
    listSurveys,
    type Survey,
    type SurveyDetail,
    type SurveyStatus,
} from '@/features/surveys/lib/surveys';
import { ApiError } from '@/lib/api';

type SortKey = 'title' | 'status' | 'responses' | 'createdBy';

const STATUS_RANK: Record<SurveyStatus, number> = {
    draft: 0,
    active: 1,
    closed: 2,
};

const STATUS_FILTER_OPTIONS: { id: SurveyStatus | 'all'; name: string }[] = [
    { id: 'all', name: 'Todas' },
    { id: 'draft', name: 'Borrador' },
    { id: 'active', name: 'Activa' },
    { id: 'closed', name: 'Cerrada' },
];

const statusBadge = (status: Survey['status']) => {
    if (status === 'active') {
        return (
            <Badge
                variant="outline"
                className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            >
                Activa
            </Badge>
        );
    }

    if (status === 'closed') {
        return (
            <Badge
                variant="outline"
                className="border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"
            >
                Cerrada
            </Badge>
        );
    }

    return (
        <Badge
            variant="outline"
            className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
        >
            Borrador
        </Badge>
    );
};

export const SurveysPage = () => {
    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [formKey, setFormKey] = useState(0);
    const [editing, setEditing] = useState<SurveyDetail | null>(null);
    const [deleting, setDeleting] = useState<Survey | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [resultsId, setResultsId] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<SurveyStatus | 'all'>(
        'all',
    );

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            setSurveys(await listSurveys());
        } catch (e) {
            setError(
                e instanceof ApiError
                    ? e.message
                    : 'No se pudo cargar la lista',
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void Promise.resolve().then(() => load());
    }, [load]);

    // Activar/cerrar (manual o por el job) avisa en vivo: la lista se
    // refresca sola, sin recargar la página.
    useNotificationStream(load);

    const openCreate = () => {
        setEditing(null);
        setFormKey((k) => k + 1);
        setFormOpen(true);
    };

    const openEdit = async (survey: Survey) => {
        try {
            const detail = await getSurvey(survey.id);

            setEditing(detail);
            setFormKey((k) => k + 1);
            setFormOpen(true);
        } catch (e) {
            toast.error(
                e instanceof ApiError
                    ? e.message
                    : 'No se pudo cargar la encuesta',
            );
        }
    };

    const runAction = async (
        survey: Survey,
        action: (id: string) => Promise<void>,
        successMessage: string,
    ) => {
        setBusyId(survey.id);

        try {
            await action(survey.id);
            toast.success(successMessage);
            await load();
        } catch (e) {
            toast.error(
                e instanceof ApiError
                    ? e.message
                    : 'No se pudo completar la acción',
            );
        } finally {
            setBusyId(null);
        }
    };

    const query = search.trim().toLowerCase();
    const filtered = surveys.filter((survey) => {
        if (query && !survey.title.toLowerCase().includes(query)) {
            return false;
        }

        return statusFilter === 'all' || survey.status === statusFilter;
    });

    const { sorted, sort, toggleSort } = useSort<Survey, SortKey>(
        filtered,
        {
            title: (a, b) => a.title.localeCompare(b.title),
            status: (a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status],
            responses: (a, b) => a.responsesCount - b.responsesCount,
            createdBy: (a, b) =>
                a.createdBy.name.localeCompare(b.createdBy.name),
        },
        { key: 'title', dir: 'asc' },
    );

    const { paged, page, pageCount, pageSize, total, setPage, setPageSize } =
        usePagination(sorted, 10);

    const columns: DataTableColumn<Survey, SortKey>[] = [
        {
            key: 'title',
            header: 'Título',
            sortKey: 'title',
            render: (survey) => survey.title,
        },
        {
            key: 'status',
            header: 'Estado',
            sortKey: 'status',
            render: (survey) => statusBadge(survey.status),
        },
        {
            key: 'responses',
            header: 'Respuestas',
            sortKey: 'responses',
            headerClassName: 'text-center',
            cellClassName: 'text-center',
            render: (survey) => survey.responsesCount,
        },
        {
            key: 'createdBy',
            header: 'Creada por',
            sortKey: 'createdBy',
            headerClassName: 'hidden sm:table-cell',
            cellClassName: 'hidden sm:table-cell',
            render: (survey) =>
                `${survey.createdBy.puntoVuela} (${survey.createdBy.name})`,
        },
        {
            key: 'actions',
            header: <span className="sr-only">Acciones</span>,
            align: 'right',
            cellClassName: 'flex justify-end gap-2',
            render: (survey) => (
                <>
                    {survey.status !== 'closed' && (
                        <IconTooltip label="Editar">
                            <Button
                                variant="secondary"
                                size="icon"
                                aria-label="Editar"
                                disabled={busyId === survey.id}
                                onClick={() => void openEdit(survey)}
                            >
                                <Pencil className="size-4" />
                            </Button>
                        </IconTooltip>
                    )}
                    {survey.status !== 'draft' && (
                        <IconTooltip label="Ver resultados">
                            <Button
                                variant="secondary"
                                size="icon"
                                aria-label="Ver resultados"
                                onClick={() => setResultsId(survey.id)}
                            >
                                <BarChart3 className="size-4" />
                            </Button>
                        </IconTooltip>
                    )}
                    {survey.status === 'active' ? (
                        <IconTooltip label="Cerrar">
                            <Button
                                variant="default"
                                className="bg-red-500 hover:bg-red-600"
                                size="icon"
                                aria-label="Cerrar"
                                disabled={busyId === survey.id}
                                onClick={() =>
                                    void runAction(
                                        survey,
                                        closeSurvey,
                                        'Encuesta cerrada.',
                                    )
                                }
                            >
                                <Square className="size-4" />
                            </Button>
                        </IconTooltip>
                    ) : (
                        <IconTooltip
                            label={
                                survey.status === 'draft'
                                    ? 'Activar (notifica a todos)'
                                    : 'Reabrir'
                            }
                        >
                            <Button
                                variant="default"
                                className="bg-green-600 hover:bg-green-700"
                                size="icon"
                                aria-label={
                                    survey.status === 'draft'
                                        ? 'Activar'
                                        : 'Reabrir'
                                }
                                disabled={busyId === survey.id}
                                onClick={() =>
                                    void runAction(
                                        survey,
                                        activateSurvey,
                                        survey.status === 'draft'
                                            ? 'Encuesta activada.'
                                            : 'Encuesta reabierta.',
                                    )
                                }
                            >
                                <Play className="size-4" />
                            </Button>
                        </IconTooltip>
                    )}

                    <IconTooltip label="Eliminar">
                        <Button
                            variant="destructive"
                            size="icon"
                            aria-label="Eliminar"
                            disabled={
                                busyId === survey.id ||
                                survey.status === 'active'
                            }
                            onClick={() => setDeleting(survey)}
                        >
                            <Trash2 className="size-4" />
                        </Button>
                    </IconTooltip>
                </>
            ),
        },
    ];

    return (
        <section>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <PageTitle icon={ClipboardList} className="mb-0">
                    Encuestas
                </PageTitle>
                <Button onClick={openCreate} className="ms-auto">
                    Nueva encuesta
                </Button>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-2">
                <SearchInput
                    value={search}
                    onChange={setSearch}
                    placeholder="Buscar por título…"
                />
                <ComboboxField
                    className="w-40 bg-card"
                    items={STATUS_FILTER_OPTIONS}
                    getValue={(o) => o.id}
                    getLabel={(o) => o.name}
                    value={statusFilter}
                    onValueChange={(value) =>
                        setStatusFilter(value as SurveyStatus | 'all')
                    }
                    searchable={false}
                />
            </div>

            <ListErrors
                error={error}
                actionError={null}
                onRetry={() => void load()}
            />

            {loading ? (
                <p role="status" className="text-muted-foreground">
                    Cargando encuestas…
                </p>
            ) : (
                <div className="rounded-xl border bg-card">
                    <DataTable
                        columns={columns}
                        rows={paged}
                        rowKey={(survey) => survey.id}
                        sort={sort}
                        onSort={toggleSort}
                    />
                </div>
            )}

            {!loading && paged.length === 0 && (
                <p className="mt-4 text-muted-foreground">
                    {query || statusFilter !== 'all'
                        ? 'No hay encuestas que coincidan con la búsqueda.'
                        : 'Todavía no hay encuestas.'}
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

            <SurveyFormDialog
                key={formKey}
                open={formOpen}
                onOpenChange={setFormOpen}
                survey={editing}
                onSaved={() => void load()}
            />

            <SurveyResultsDialog
                open={resultsId !== null}
                onOpenChange={(open) => !open && setResultsId(null)}
                surveyId={resultsId}
            />

            {deleting && (
                <ConfirmDeleteDialog
                    open={deleting !== null}
                    onOpenChange={(open) => !open && setDeleting(null)}
                    title="Eliminar encuesta"
                    description={`¿Eliminar «${deleting.title}»?`}
                    confirmText={deleting.title}
                    confirmLabel="Eliminar"
                    deletingLabel="Eliminando…"
                    errorFallback="No se pudo eliminar la encuesta"
                    successLabel="Encuesta eliminada."
                    onConfirm={() => deleteSurvey(deleting.id)}
                    onDeleted={() => {
                        setDeleting(null);
                        void load();
                    }}
                />
            )}
        </section>
    );
};
