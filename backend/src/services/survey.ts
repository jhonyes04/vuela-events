import { Prisma } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import { recordAudit } from './audit.js';
import { getActiveUserIds, notifyUsers, pingUsers } from './notification.js';
import type { AuthUser } from '../lib/authUser.js';

export type SurveyFailure =
    | 'not_found'
    | 'forbidden'
    | 'not_draft'
    | 'not_active'
    | 'already_active'
    | 'survey_active'
    | 'no_questions'
    | 'already_answered'
    | 'invalid_answers'
    | 'owner_not_found';

export class SurveyError extends Error {
    readonly reason: SurveyFailure;

    constructor(reason: SurveyFailure) {
        super(reason);

        this.name = 'SurveyError';
        this.reason = reason;
    }
}

export interface SurveyChoiceInput {
    value: string;
    label: string;
    description?: string;
}

export interface SurveyQuestionInput {
    prompt: string;
    description: string | null;
    type: 'choice' | 'text';
    allowMultiple: boolean;
    required: boolean;
    choices: SurveyChoiceInput[] | null;
}

export interface SurveyAnswerInput {
    questionId: string;
    value: string;
}

const surveySelect = {
    id: true,
    title: true,
    status: true,
    createdAt: true,
    activatedAt: true,
    closedAt: true,
    createdBy: { select: { id: true, name: true, puntoVuela: true } },
    _count: { select: { responses: true } },
} as const;

const questionSelect = {
    id: true,
    order: true,
    prompt: true,
    description: true,
    type: true,
    allowMultiple: true,
    required: true,
    choices: true,
} as const;

const toQuestionCreateInput = (questions: SurveyQuestionInput[]) =>
    questions.map((question, index) => ({
        order: index,
        prompt: question.prompt,
        description: question.description,
        type: question.type,
        allowMultiple: question.allowMultiple,
        required: question.required,
        choices:
            (question.choices as unknown as
                | Prisma.InputJsonValue[]
                | undefined) ?? Prisma.JsonNull,
    }));

export interface AssignableUser {
    id: string;
    name: string;
    puntoVuela: string | null;
}

// Candidatos a propietario: cualquier activo cuyo rol tenga el permiso
// surveys:manage, se recalcula según lo que haya en role_permissions (no una
// lista fija de roles).
export const listAssignableUsers = (): Promise<AssignableUser[]> =>
    prisma.user.findMany({
        where: {
            active: true,
            role: {
                permissions: {
                    some: { permissionId: 'surveys:manage' },
                },
            },
        },
        select: { id: true, name: true, puntoVuela: true },
        orderBy: [{ puntoVuela: 'asc' }, { name: 'asc' }],
    });

const assignableUserIsValid = async (id: string): Promise<boolean> => {
    const count = await prisma.user.count({
        where: {
            id,
            active: true,
            role: {
                permissions: {
                    some: { permissionId: 'surveys:manage' },
                },
            },
        },
    });

    return count > 0;
};

export const listSurveys = () =>
    prisma.survey.findMany({
        orderBy: { createdAt: 'desc' },
        select: surveySelect,
    });

export const getSurveyWithQuestions = async (id: string) => {
    const survey = await prisma.survey.findUnique({
        where: { id },
        select: {
            ...surveySelect,
            questions: { orderBy: { order: 'asc' }, select: questionSelect },
        },
    });

    if (!survey) {
        throw new SurveyError('not_found');
    }

    return survey;
};

export const createSurvey = async (
    actor: Pick<AuthUser, 'id'>,
    title: string,
    questions: SurveyQuestionInput[],
    ownerId?: string,
) => {
    const createdById = ownerId ?? actor.id;

    if (ownerId && !(await assignableUserIsValid(ownerId))) {
        throw new SurveyError('owner_not_found');
    }

    const survey = await prisma.survey.create({
        data: {
            title,
            createdById,
            questions: { create: toQuestionCreateInput(questions) },
        },
        select: surveySelect,
    });

    await recordAudit({
        action: 'survey_created',
        actorId: actor.id,
        newValue: title.slice(0, 100),
    });

    return survey;
};

export const updateSurvey = async (
    actor: Pick<AuthUser, 'id'>,
    id: string,
    title: string,
    questions: SurveyQuestionInput[],
    ownerId?: string,
) => {
    const survey = await prisma.survey.findUnique({ where: { id } });

    if (!survey) {
        throw new SurveyError('not_found');
    }

    if (survey.status !== 'draft') {
        throw new SurveyError('not_draft');
    }

    if (ownerId && !(await assignableUserIsValid(ownerId))) {
        throw new SurveyError('owner_not_found');
    }

    await prisma.$transaction([
        prisma.surveyQuestion.deleteMany({ where: { surveyId: id } }),
        prisma.survey.update({
            where: { id },
            data: {
                title,
                ...(ownerId && { createdById: ownerId }),
                questions: { create: toQuestionCreateInput(questions) },
            },
        }),
    ]);

    await recordAudit({
        action: 'survey_updated',
        actorId: actor.id,
        oldValue: survey.title.slice(0, 100),
        newValue: title.slice(0, 100),
    });
};

export const activateSurvey = async (
    actor: Pick<AuthUser, 'id'>,
    id: string,
) => {
    const survey = await prisma.survey.findUnique({
        where: { id },
        include: { _count: { select: { questions: true } } },
    });

    if (!survey) {
        throw new SurveyError('not_found');
    }

    if (survey.status === 'active') {
        throw new SurveyError('already_active');
    }

    if (survey._count.questions === 0) {
        throw new SurveyError('no_questions');
    }

    // Reabrir una cerrada no cuenta como lanzamiento: solo se avisa a quien
    // todavía no ha contestado, no a quien ya participó.
    const isReopen = survey.status === 'closed';

    await prisma.survey.update({
        where: { id },
        data: { status: 'active', activatedAt: new Date(), closedAt: null },
    });

    let userIds = await getActiveUserIds({ excludeRoles: ['dt', 'admin'] });

    if (isReopen) {
        const participants = await prisma.surveyParticipation.findMany({
            where: { surveyId: id },
            select: { userId: true },
        });
        const answeredIds = new Set(participants.map((p) => p.userId));

        userIds = userIds.filter((userId) => !answeredIds.has(userId));
    }

    await notifyUsers(userIds, {
        type: 'new_survey',
        title: isReopen
            ? 'La encuesta sigue abierta'
            : 'Nueva encuesta disponible',
        body: survey.title,
    });

    await recordAudit({
        action: isReopen ? 'survey_reopened' : 'survey_activated',
        actorId: actor.id,
        newValue: survey.title.slice(0, 100),
    });
};

export const closeSurvey = async (actor: Pick<AuthUser, 'id'>, id: string) => {
    const survey = await prisma.survey.findUnique({ where: { id } });

    if (!survey) {
        throw new SurveyError('not_found');
    }

    if (survey.status !== 'active') {
        throw new SurveyError('not_active');
    }

    await prisma.survey.update({
        where: { id },
        data: { status: 'closed', closedAt: new Date() },
    });

    // Para que desaparezca del menú en vivo a quien la tenía pendiente.
    const participants = await prisma.surveyParticipation.findMany({
        where: { surveyId: id },
        select: { userId: true },
    });
    const answeredIds = new Set(participants.map((p) => p.userId));

    const userIds = await getActiveUserIds({ excludeRoles: ['admin'] });

    pingUsers(
        userIds.filter(
            (userId) =>
                !answeredIds.has(userId) && userId !== survey.createdById,
        ),
    );

    await recordAudit({
        action: 'survey_closed',
        actorId: actor.id,
        newValue: survey.title.slice(0, 100),
    });
};

export const deleteSurvey = async (actor: Pick<AuthUser, 'id'>, id: string) => {
    const survey = await prisma.survey.findUnique({ where: { id } });

    if (!survey) {
        throw new SurveyError('not_found');
    }

    if (survey.status === 'active') {
        throw new SurveyError('survey_active');
    }

    await prisma.survey.delete({ where: { id } });

    await recordAudit({
        action: 'survey_deleted',
        actorId: actor.id,
        oldValue: survey.title.slice(0, 100),
    });
};

// Escucha activa pendiente para el usuario, nunca para admin y si ya participó
export const getPendingSurveyForUser = async (
    actor: Pick<AuthUser, 'id' | 'roleId'>,
) => {
    if (actor.roleId === 'admin') return null;

    return prisma.survey.findFirst({
        where: {
            status: 'active',
            participants: { none: { userId: actor.id } },
            // Un dt no responde su propia encuesta (sí puede responder las
            // de otro dt/admin).
            ...(actor.roleId === 'dt' && {
                createdById: { not: actor.id },
            }),
        },
        orderBy: { activatedAt: 'asc' },
        select: {
            id: true,
            title: true,
            questions: { orderBy: { order: 'asc' }, select: questionSelect },
        },
    });
};

// Respuestas anónimas. Sólo marca "ya contestó" en SurveyParticipation. Sin relación con el contenido, para que no se pueda cruzar identidad con respuesta
export const submitSurveyResponse = async (
    actor: Pick<AuthUser, 'id' | 'roleId'>,
    surveyId: string,
    answers: SurveyAnswerInput[],
) => {
    if (actor.roleId === 'admin') {
        throw new SurveyError('forbidden');
    }

    const survey = await prisma.survey.findUnique({
        where: { id: surveyId },
        select: {
            status: true,
            createdById: true,
            questions: { select: { id: true, required: true } },
        },
    });

    if (!survey) {
        throw new SurveyError('not_found');
    }

    if (survey.status !== 'active') {
        throw new SurveyError('not_active');
    }

    if (actor.roleId === 'dt' && survey.createdById === actor.id) {
        throw new SurveyError('forbidden');
    }

    const alreadyAnswered = await prisma.surveyParticipation.findUnique({
        where: { surveyId_userId: { surveyId, userId: actor.id } },
    });

    if (alreadyAnswered) {
        throw new SurveyError('already_answered');
    }

    const questionIds = new Set(
        survey.questions.map((question) => question.id),
    );
    const answeredIds = new Set(answers.map((answer) => answer.questionId));

    const allAnswersBelong = answers.every((answer) =>
        questionIds.has(answer.questionId),
    );

    const allRequiredAnswered = survey.questions
        .filter((question) => question.required)
        .every((question) => answeredIds.has(question.id));

    if (!allAnswersBelong || !allRequiredAnswered) {
        throw new SurveyError('invalid_answers');
    }

    await prisma.$transaction([
        prisma.surveyResponse.create({
            data: {
                surveyId,
                answers: {
                    create: answers.map((answer) => ({
                        questionId: answer.questionId,
                        value: answer.value,
                    })),
                },
            },
        }),
        prisma.surveyParticipation.create({
            data: { surveyId, userId: actor.id },
        }),
    ]);
};

export interface SurveyResultChoiceCount {
    value: string;
    label: string;
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
    status: string;
    responsesCount: number;
    questions: SurveyResultQuestion[];
}

// Agregados por pregunta, nunca por respuesta: no hay nada aquí que cruce
// una respuesta concreta con quién la dio.
export const getSurveyResults = async (id: string): Promise<SurveyResults> => {
    const survey = await prisma.survey.findUnique({
        where: { id },
        select: {
            id: true,
            title: true,
            status: true,
            _count: { select: { responses: true } },
            questions: {
                orderBy: { order: 'asc' },
                select: {
                    id: true,
                    order: true,
                    prompt: true,
                    type: true,
                    choices: true,
                    answers: { select: { value: true } },
                },
            },
        },
    });

    if (!survey) {
        throw new SurveyError('not_found');
    }

    const questions: SurveyResultQuestion[] = survey.questions.map(
        (question) => {
            if (question.type === 'text') {
                return {
                    id: question.id,
                    order: question.order,
                    prompt: question.prompt,
                    type: 'text',
                    counts: null,
                    answers: question.answers.map((answer) => answer.value),
                };
            }

            const choices =
                (question.choices as unknown as
                    | SurveyChoiceInput[]
                    | null) ?? [];
            const tally = new Map(choices.map((choice) => [choice.value, 0]));

            for (const answer of question.answers) {
                for (const value of answer.value.split(',')) {
                    const trimmed = value.trim();

                    tally.set(trimmed, (tally.get(trimmed) ?? 0) + 1);
                }
            }

            return {
                id: question.id,
                order: question.order,
                prompt: question.prompt,
                type: 'choice',
                counts: choices.map((choice) => ({
                    value: choice.value,
                    label: choice.label,
                    count: tally.get(choice.value) ?? 0,
                })),
                answers: null,
            };
        },
    );

    return {
        id: survey.id,
        title: survey.title,
        status: survey.status,
        responsesCount: survey._count.responses,
        questions,
    };
};
