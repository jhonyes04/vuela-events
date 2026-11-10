import { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Progress,
    ProgressLabel,
    ProgressValue,
} from '@/components/ui/progress';
import { ApiError } from '@/lib/api';
import {
    getSurveyResults,
    type SurveyResultChoiceCount,
    type SurveyResults,
} from '@/features/surveys/lib/surveys';

const totalCount = (counts: SurveyResultChoiceCount[]) =>
    counts.reduce((sum, choice) => sum + choice.count, 0);

interface SurveyResultsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    surveyId: string | null;
}

export const SurveyResultsDialog = ({
    open,
    onOpenChange,
    surveyId,
}: SurveyResultsDialogProps) => {
    const [results, setResults] = useState<SurveyResults | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open || !surveyId) return;

        void Promise.resolve().then(() => {
            setLoading(true);
            setError(null);
            setResults(null);

            return getSurveyResults(surveyId)
                .then(setResults)
                .catch((e: unknown) =>
                    setError(
                        e instanceof ApiError
                            ? e.message
                            : 'No se pudieron cargar los resultados',
                    ),
                )
                .finally(() => setLoading(false));
        });
    }, [open, surveyId]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{results?.title ?? 'Resultados'}</DialogTitle>
                    {results && (
                        <DialogDescription>
                            {results.responsesCount === 1
                                ? '1 respuesta'
                                : `${results.responsesCount} respuestas`}
                        </DialogDescription>
                    )}
                </DialogHeader>

                {loading && (
                    <p className="text-muted-foreground">
                        Cargando resultados…
                    </p>
                )}
                {error && <p className="text-sm text-destructive">{error}</p>}

                {results && (
                    <div className="grid gap-5">
                        {results.questions.map((question) => (
                            <div key={question.id} className="grid gap-2">
                                <p className="text-sm font-medium">
                                    {question.prompt}
                                </p>

                                {question.type === 'choice' ? (
                                    <div className="grid gap-2.5">
                                        {question.counts!.map((choice) => {
                                            const total = totalCount(
                                                question.counts!,
                                            );
                                            const pct =
                                                total > 0
                                                    ? Math.round(
                                                          (choice.count /
                                                              total) *
                                                              100,
                                                      )
                                                    : 0;

                                            return (
                                                <Progress
                                                    key={choice.value}
                                                    value={pct}
                                                >
                                                    <ProgressLabel>
                                                        {choice.label}
                                                        {choice.description && (
                                                            <span className="text-muted-foreground">
                                                                {' '}
                                                                —{' '}
                                                                {
                                                                    choice.description
                                                                }
                                                            </span>
                                                        )}
                                                    </ProgressLabel>
                                                    <ProgressValue>
                                                        {() =>
                                                            `${choice.count} (${pct}%)`
                                                        }
                                                    </ProgressValue>
                                                </Progress>
                                            );
                                        })}
                                    </div>
                                ) : question.answers!.length > 0 ? (
                                    <ul className="grid gap-1">
                                        {question.answers!.map(
                                            (answer, index) => (
                                                <li
                                                    key={index}
                                                    className="rounded-lg bg-muted/60 p-2 text-sm whitespace-pre-line"
                                                >
                                                    {answer}
                                                </li>
                                            ),
                                        )}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        Sin respuestas.
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};
