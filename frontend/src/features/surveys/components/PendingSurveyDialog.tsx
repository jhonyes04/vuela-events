import { useEffect, useState, type SubmitEvent } from 'react';
import { toast } from 'sonner';
import {
    Questionnaire,
    QuestionnaireActions,
    QuestionnaireChoice,
    QuestionnaireChoiceDescription,
    QuestionnaireChoices,
    QuestionnaireDescription,
    QuestionnaireError,
    QuestionnaireInput,
    QuestionnaireItem,
    QuestionnaireNext,
    QuestionnairePrevious,
    QuestionnaireProgress,
    QuestionnaireSkip,
    QuestionnaireSubmit,
    QuestionnaireTitle,
} from '@/components/ui/questionnaire';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/features/auth/hooks/context';
import { ApiError } from '@/lib/api';
import { usePendingSurveyStore } from '@/features/surveys/store';
import {
    getPendingSurvey,
    submitSurveyResponse,
    type SurveyAnswerInput,
} from '@/features/surveys/lib/surveys';

export const PendingSurveyDialog = () => {
    const { user } = useAuth();
    const survey = usePendingSurveyStore((s) => s.survey);
    const open = usePendingSurveyStore((s) => s.open);
    const ensureStream = usePendingSurveyStore((s) => s.ensureStream);
    const openDialog = usePendingSurveyStore((s) => s.openDialog);
    const closeDialog = usePendingSurveyStore((s) => s.closeDialog);
    const clear = usePendingSurveyStore((s) => s.clear);
    const [submitting, setSubmitting] = useState(false);

    // Mantiene el estado de la encuesta pendiente al día (para el menú),
    // sin que esto por sí solo abra el diálogo.
    useEffect(() => {
        if (!user || user.roleId === 'admin') return;

        ensureStream();
    }, [user, ensureStream]);

    // Solo al entrar: si ya hay una pendiente sin hacer, se abre una vez.
    // Después solo se abre al pulsar la opción del menú.
    useEffect(() => {
        if (!user || user.roleId === 'admin') return;

        getPendingSurvey()
            .then((pending) => {
                if (pending) openDialog();
            })
            .catch(() => {});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    if (!survey) return null;

    const items = survey.questions.map((question) => ({
        name: question.id,
        required: question.required,
        choices: question.choices?.map((choice) => ({ value: choice.value })),
    }));

    const handleSubmit = async (e: SubmitEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const formData = new FormData(e.currentTarget as HTMLFormElement);
            const answers: SurveyAnswerInput[] = survey.questions.flatMap(
                (question) => {
                    const values = formData
                        .getAll(question.id)
                        .map(String)
                        .filter((value) => value.trim());

                    return values.length > 0
                        ? [{ questionId: question.id, value: values.join(', ') }]
                        : [];
                },
            );

            await submitSurveyResponse(survey.id, answers);

            toast.success('¡Gracias por tu respuesta!');
            clear();
        } catch (error) {
            toast.error(
                error instanceof ApiError
                    ? error.message
                    : 'No se pudo enviar la encuesta',
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !o && closeDialog()}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{survey.title}</DialogTitle>
                </DialogHeader>

                <Questionnaire
                    items={items}
                    onSubmit={(e) => void handleSubmit(e)}
                >
                    <QuestionnaireProgress />

                    {survey.questions.map((question) => (
                        <QuestionnaireItem
                            key={question.id}
                            name={question.id}
                            required={question.required}
                            multiple={question.allowMultiple}
                        >
                            <QuestionnaireTitle>
                                {question.prompt}
                            </QuestionnaireTitle>
                            {question.description && (
                                <QuestionnaireDescription>
                                    {question.description}
                                </QuestionnaireDescription>
                            )}

                            {question.type === 'choice' ? (
                                <QuestionnaireChoices>
                                    {question.choices?.map((choice) => (
                                        <QuestionnaireChoice
                                            key={choice.value}
                                            value={choice.value}
                                        >
                                            <span className="font-medium">
                                                {choice.label}
                                            </span>
                                            {choice.description && (
                                                <QuestionnaireChoiceDescription>
                                                    {choice.description}
                                                </QuestionnaireChoiceDescription>
                                            )}
                                        </QuestionnaireChoice>
                                    ))}
                                </QuestionnaireChoices>
                            ) : (
                                <QuestionnaireInput placeholder="Tu respuesta" />
                            )}

                            <QuestionnaireError />
                        </QuestionnaireItem>
                    ))}

                    <QuestionnaireActions>
                        <QuestionnairePrevious>Anterior</QuestionnairePrevious>
                        <QuestionnaireSkip>Saltar</QuestionnaireSkip>
                        <QuestionnaireNext>Siguiente</QuestionnaireNext>
                        <QuestionnaireSubmit disabled={submitting}>
                            {submitting ? 'Enviando…' : 'Enviar'}
                        </QuestionnaireSubmit>
                    </QuestionnaireActions>
                </Questionnaire>
            </DialogContent>
        </Dialog>
    );
};
