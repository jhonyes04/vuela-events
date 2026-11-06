import { useState, type SubmitEvent } from 'react';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OwnerField } from '@/components/OwnerField';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/features/auth/hooks/context';
import { SurveyQuestionCard } from '@/features/surveys/components/SurveyQuestionCard';
import {
    newChoice,
    newQuestion,
    toDraftQuestion,
    toQuestionInput,
    type DraftQuestion,
} from '@/features/surveys/lib/surveyDraft';
import {
    createSurvey,
    listAssignableUsers,
    updateSurvey,
    type SurveyDetail,
} from '@/features/surveys/lib/surveys';

interface SurveyFormBodyProps {
    survey: SurveyDetail | null;
    onSaved: () => void;
    onClose: () => void;
}

const SurveyFormBody = ({ survey, onSaved, onClose }: SurveyFormBodyProps) => {
    const { user } = useAuth();
    const [title, setTitle] = useState(survey?.title ?? '');
    const [ownerId, setOwnerId] = useState(
        survey?.createdBy.id ?? user?.id ?? '',
    );
    const [questions, setQuestions] = useState<DraftQuestion[]>(
        survey?.questions.map(toDraftQuestion) ?? [newQuestion()],
    );
    const [submitting, setSubmitting] = useState(false);

    const updateQuestion = (key: string, patch: Partial<DraftQuestion>) =>
        setQuestions((qs) =>
            qs.map((q) => (q.key === key ? { ...q, ...patch } : q)),
        );

    const removeQuestion = (key: string) =>
        setQuestions((qs) => qs.filter((q) => q.key !== key));

    const moveQuestion = (key: string, dir: -1 | 1) =>
        setQuestions((qs) => {
            const index = qs.findIndex((q) => q.key === key);
            const target = index + dir;

            if (target < 0 || target >= qs.length) return qs;

            const next = [...qs];
            [next[index], next[target]] = [next[target]!, next[index]!];

            return next;
        });

    const addChoice = (qKey: string) =>
        setQuestions((qs) =>
            qs.map((q) =>
                q.key === qKey
                    ? { ...q, choices: [...q.choices, newChoice()] }
                    : q,
            ),
        );

    const updateChoice = (
        qKey: string,
        cKey: string,
        label: string,
        description: string,
    ) =>
        setQuestions((qs) =>
            qs.map((q) =>
                q.key !== qKey
                    ? q
                    : {
                          ...q,
                          choices: q.choices.map((c) =>
                              c.key === cKey ? { ...c, label, description } : c,
                          ),
                      },
            ),
        );

    const removeChoice = (qKey: string, cKey: string) =>
        setQuestions((qs) =>
            qs.map((q) =>
                q.key !== qKey
                    ? q
                    : {
                          ...q,
                          choices: q.choices.filter((c) => c.key !== cKey),
                      },
            ),
        );

    const handleSubmit = async (e: SubmitEvent) => {
        e.preventDefault();

        if (questions.length === 0) {
            toast.error('Añade al menos una pregunta');
            return;
        }

        const invalid = questions.find(
            (q) =>
                !q.prompt.trim() ||
                (q.kind !== 'text' &&
                    q.choices.filter((c) => c.label.trim()).length < 2),
        );

        if (invalid) {
            toast.error(
                'Revisa las preguntas: falta el enunciado o hay menos de 2 opciones',
            );
            return;
        }

        setSubmitting(true);

        try {
            const input = questions.map(toQuestionInput);

            if (survey) {
                await updateSurvey(
                    survey.id,
                    title,
                    input,
                    ownerId || undefined,
                );
            } else {
                await createSurvey(title, input, ownerId || undefined);
            }

            toast.success(
                survey ? 'Encuesta actualizada.' : 'Encuesta creada.',
            );
            onSaved();
            onClose();
        } catch (error) {
            toast.error(
                error instanceof ApiError
                    ? error.message
                    : 'No se pudo guardar la encuesta',
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
                <DialogTitle>
                    {survey ? 'Editar encuesta' : 'Nueva encuesta'}
                </DialogTitle>
            </DialogHeader>

            <form
                id="survey-form"
                onSubmit={(e) => void handleSubmit(e)}
                className="grid gap-5"
            >
                <div className="grid gap-1.5">
                    <Label htmlFor="survey-title">Título *</Label>
                    <Input
                        id="survey-title"
                        required
                        minLength={1}
                        maxLength={200}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </div>

                <div className="grid gap-4">
                    {questions.map((question, index) => (
                        <SurveyQuestionCard
                            key={question.key}
                            question={question}
                            index={index}
                            isFirst={index === 0}
                            isLast={index === questions.length - 1}
                            canRemove={questions.length > 1}
                            onUpdate={(patch) =>
                                updateQuestion(question.key, patch)
                            }
                            onRemove={() => removeQuestion(question.key)}
                            onMoveUp={() => moveQuestion(question.key, -1)}
                            onMoveDown={() => moveQuestion(question.key, 1)}
                            onAddChoice={() => addChoice(question.key)}
                            onUpdateChoice={(choiceKey, label, description) =>
                                updateChoice(
                                    question.key,
                                    choiceKey,
                                    label,
                                    description,
                                )
                            }
                            onRemoveChoice={(choiceKey) =>
                                removeChoice(question.key, choiceKey)
                            }
                        />
                    ))}
                </div>

                <Button
                    type="button"
                    variant="secondary"
                    className="w-fit ms-auto"
                    onClick={() => setQuestions((qs) => [...qs, newQuestion()])}
                >
                    <Plus className="size-4" />
                    Añadir pregunta
                </Button>

                <div className="border-t py-4">
                    <OwnerField
                        value={ownerId}
                        onValueChange={setOwnerId}
                        disabled={submitting}
                        fetchCandidates={listAssignableUsers}
                        emptyMessage="No hay usuarios con permiso de encuestas"
                    />
                </div>
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
                <Button type="submit" form="survey-form" disabled={submitting}>
                    {submitting ? 'Guardando…' : 'Guardar'}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
};

interface SurveyFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    // null = crear, survey = editar (solo si está en borrador).
    survey: SurveyDetail | null;
    onSaved: () => void;
}

export const SurveyFormDialog = ({
    open,
    onOpenChange,
    survey,
    onSaved,
}: SurveyFormDialogProps) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        {open && (
            <SurveyFormBody
                key={survey?.id ?? 'new'}
                survey={survey}
                onSaved={onSaved}
                onClose={() => onOpenChange(false)}
            />
        )}
    </Dialog>
);
