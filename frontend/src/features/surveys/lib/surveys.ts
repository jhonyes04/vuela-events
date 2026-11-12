import { api } from '@/lib/api';

export interface SurveyChoice {
    value: string;
    label: string;
    description?: string;
}

export interface SurveyQuestion {
    id: string;
    order: number;
    prompt: string;
    description: string | null;
    type: 'choice' | 'text';
    allowMultiple: boolean;
    required: boolean;
    choices: SurveyChoice[] | null;
}

export interface SurveyQuestionInput {
    prompt: string;
    description: string | null;
    type: 'choice' | 'text';
    allowMultiple: boolean;
    required: boolean;
    choices: SurveyChoice[] | null;
}

export type SurveyStatus = 'draft' | 'active' | 'closed';

export interface SurveyOwner {
    id: string;
    name: string;
    puntoVuela: string | null;
}

export interface Survey {
    id: string;
    title: string;
    status: SurveyStatus;
    createdAt: string;
    activatedAt: string | null;
    closedAt: string | null;
    scheduledStartAt: string | null;
    scheduledEndAt: string | null;
    showOnLogin: boolean;
    createdBy: SurveyOwner;
    responsesCount: number;
}

export interface SurveyDetail extends Survey {
    questions: SurveyQuestion[];
}

export interface PendingSurvey {
    id: string;
    title: string;
    showOnLogin: boolean;
    questions: SurveyQuestion[];
}

export interface SurveyAnswerInput {
    questionId: string;
    value: string;
}

interface RawSurvey extends Omit<Survey, 'responsesCount'> {
    _count: { responses: number };
}

const flattenSurvey = <T extends { _count: { responses: number } }>({
    _count,
    ...rest
}: T) => ({ ...rest, responsesCount: _count.responses });

export const listSurveys = async (): Promise<Survey[]> => {
    const { surveys } = await api.get<{ surveys: RawSurvey[] }>('/surveys');

    return surveys.map(flattenSurvey);
};

export const getSurvey = async (id: string): Promise<SurveyDetail> => {
    const { survey } = await api.get<{
        survey: RawSurvey & { questions: SurveyQuestion[] };
    }>(`/surveys/${id}`);

    return flattenSurvey(survey);
};

export const createSurvey = async (
    title: string,
    questions: SurveyQuestionInput[],
    ownerId?: string,
    scheduledStartAt?: string,
    scheduledEndAt?: string,
    showOnLogin?: boolean,
): Promise<Survey> => {
    const { survey } = await api.post<{ survey: RawSurvey }>('/surveys', {
        title,
        questions,
        ...(ownerId && { ownerId }),
        ...(scheduledStartAt && { scheduledStartAt }),
        ...(scheduledEndAt && { scheduledEndAt }),
        showOnLogin,
    });

    return flattenSurvey(survey);
};

export const updateSurvey = async (
    id: string,
    title: string,
    questions: SurveyQuestionInput[],
    ownerId?: string,
    scheduledStartAt?: string,
    scheduledEndAt?: string,
    showOnLogin?: boolean,
): Promise<void> =>
    api.patch(`/surveys/${id}`, {
        title,
        questions,
        ...(ownerId && { ownerId }),
        ...(scheduledStartAt && { scheduledStartAt }),
        ...(scheduledEndAt && { scheduledEndAt }),
        showOnLogin,
    });

export const updateSurveyActiveSettings = async (
    id: string,
    scheduledEndAt?: string,
    showOnLogin?: boolean,
): Promise<void> =>
    api.patch(`/surveys/${id}/settings`, {
        ...(scheduledEndAt && { scheduledEndAt }),
        showOnLogin,
    });

export interface AssignableUser {
    id: string;
    name: string;
    puntoVuela: string | null;
}

export const listAssignableUsers = async (): Promise<AssignableUser[]> => {
    const { users } = await api.get<{ users: AssignableUser[] }>(
        '/surveys/assignable-users',
    );

    return users;
};

export const activateSurvey = async (id: string): Promise<void> =>
    api.post(`/surveys/${id}/activate`);

export const closeSurvey = async (id: string): Promise<void> =>
    api.post(`/surveys/${id}/close`);

export const deleteSurvey = async (id: string): Promise<void> =>
    api.delete(`/surveys/${id}`);

export const getPendingSurvey = async (): Promise<PendingSurvey | null> => {
    const { survey } = await api.get<{ survey: PendingSurvey | null }>(
        '/surveys/pending',
    );

    return survey;
};

export const submitSurveyResponse = async (
    id: string,
    answers: SurveyAnswerInput[],
): Promise<void> => api.post(`/surveys/${id}/responses`, { answers });

export interface SurveyResultChoiceCount {
    value: string;
    label: string;
    description?: string;
    count: number;
}

export interface SurveyResultQuestion {
    id: string;
    order: number;
    prompt: string;
    type: 'choice' | 'text';
    counts: SurveyResultChoiceCount[] | null;
    answers: string[] | null;
}

export interface SurveyResults {
    id: string;
    title: string;
    status: SurveyStatus;
    responsesCount: number;
    questions: SurveyResultQuestion[];
}

export const getSurveyResults = async (id: string): Promise<SurveyResults> => {
    const { results } = await api.get<{ results: SurveyResults }>(
        `/surveys/${id}/results`,
    );

    return results;
};
