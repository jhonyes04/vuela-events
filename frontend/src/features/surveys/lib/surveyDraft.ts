import type { SurveyQuestion, SurveyQuestionInput } from '@/features/surveys/lib/surveys';

export type QuestionKind = 'single' | 'multiple' | 'text';

export const QUESTION_KIND_OPTIONS: { id: QuestionKind; name: string }[] = [
    { id: 'single', name: 'Opción única' },
    { id: 'multiple', name: 'Opción múltiple' },
    { id: 'text', name: 'Texto libre' },
];

export interface DraftChoice {
    key: string;
    label: string;
    description: string;
}

export interface DraftQuestion {
    key: string;
    prompt: string;
    description: string;
    kind: QuestionKind;
    required: boolean;
    choices: DraftChoice[];
}

export const newChoice = (label = ''): DraftChoice => ({
    key: crypto.randomUUID(),
    label,
    description: '',
});

export const newQuestion = (): DraftQuestion => ({
    key: crypto.randomUUID(),
    prompt: '',
    description: '',
    kind: 'single',
    required: true,
    choices: [newChoice(), newChoice()],
});

export const scaleChoices = (): DraftChoice[] =>
    ['1', '2', '3', '4', '5'].map((label) => newChoice(label));

export const toDraftQuestion = (question: SurveyQuestion): DraftQuestion => ({
    key: question.id,
    prompt: question.prompt,
    description: question.description ?? '',
    kind:
        question.type === 'text'
            ? 'text'
            : question.allowMultiple
              ? 'multiple'
              : 'single',
    required: question.required,
    choices: question.choices?.map((choice) => ({
        key: crypto.randomUUID(),
        label: choice.label,
        description: choice.description ?? '',
    })) ?? [newChoice(), newChoice()],
});

export const toQuestionInput = (
    question: DraftQuestion,
): SurveyQuestionInput => ({
    prompt: question.prompt.trim(),
    description: question.description.trim() || null,
    type: question.kind === 'text' ? 'text' : 'choice',
    allowMultiple: question.kind === 'multiple',
    required: question.required,
    choices:
        question.kind === 'text'
            ? null
            : question.choices
                  .filter((choice) => choice.label.trim())
                  .map((choice, index) => ({
                      value: String(index + 1),
                      label: choice.label.trim(),
                      ...(choice.description.trim() && {
                          description: choice.description.trim(),
                      }),
                  })),
});
