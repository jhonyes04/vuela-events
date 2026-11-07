import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import {
    NO_CONTROL_OR_TAGS,
    MULTILINE_NO_CONTROL_OR_TAGS,
} from '../lib/textValidation.js';
import {
    SurveyError,
    activateSurvey,
    closeSurvey,
    createSurvey,
    deleteSurvey,
    getPendingSurveyForUser,
    getSurveyResults,
    getSurveyWithQuestions,
    listAssignableUsers,
    listSurveys,
    submitSurveyResponse,
    updateSurvey,
} from '../services/survey.js';

const idParamsSchema = z.object({ id: z.uuid() });

const choiceSchema = z.strictObject({
    value: z.string().trim().min(1).max(60).regex(NO_CONTROL_OR_TAGS),
    label: z.string().trim().min(1).max(120).regex(NO_CONTROL_OR_TAGS),
    description: z
        .string()
        .trim()
        .min(1)
        .max(200)
        .regex(NO_CONTROL_OR_TAGS)
        .optional(),
});

const questionSchema = z
    .strictObject({
        prompt: z.string().trim().min(1).max(300).regex(NO_CONTROL_OR_TAGS),
        description: z
            .string()
            .trim()
            .min(1)
            .max(300)
            .regex(NO_CONTROL_OR_TAGS)
            .nullable(),
        type: z.enum(['choice', 'text']),
        allowMultiple: z.boolean(),
        required: z.boolean(),
        choices: z.array(choiceSchema).min(2).max(10).nullable(),
    })
    .refine(
        (q) => (q.type === 'choice' ? q.choices !== null : q.choices === null),
        { error: 'Las opciones no coinciden con el tipo de pregunta' },
    );

const surveySchema = z.strictObject({
    title: z.string().trim().min(1).max(200).regex(NO_CONTROL_OR_TAGS),
    questions: z.array(questionSchema).min(1).max(30),
    ownerId: z.uuid().optional(),
    scheduledStartAt: z.iso.datetime().optional(),
    scheduledEndAt: z.iso.datetime().optional(),
});

const answerSchema = z.strictObject({
    questionId: z.uuid(),
    value: z
        .string()
        .trim()
        .min(1)
        .max(1000)
        .regex(MULTILINE_NO_CONTROL_OR_TAGS),
});

const submitSchema = z.strictObject({
    answers: z.array(answerSchema).max(30),
});

const surveyErrors = {
    not_found: [404, 'Encuesta no encontrada'],
    forbidden: [403, 'No tienes permiso para esto'],
    not_draft: [409, 'La encuesta ya no está en borrador'],
    not_active: [409, 'La encuesta no está activa'],
    already_active: [409, 'La encuesta ya está activa'],
    survey_active: [
        409,
        'No se puede eliminar una encuesta activa, ciérrala antes',
    ],
    no_questions: [400, 'La encuesta no tiene preguntas'],
    already_answered: [409, 'Ya has respondido esta encuesta'],
    invalid_answers: [400, 'Respuestas no válidas'],
    owner_not_found: [400, 'Propietario no válido'],
    invalid_schedule: [400, 'Fechas programadas no válidas'],
} as const;

export const surveysRouter = Router();

surveysRouter.use(requireAuth);

// Usuario: encuesta pendiente (declarada antes de '/:id' para que no choque)
surveysRouter.get('/pending', async (req, res) => {
    const actor = req.user;

    if (!actor) {
        res.status(401).json({ error: 'Autenticación requerida' });
        return;
    }

    const survey = await getPendingSurveyForUser(actor);

    res.json({ survey });
});

surveysRouter.post('/:id/responses', async (req, res) => {
    const actor = req.user;

    if (!actor) {
        res.status(401).json({ error: 'Autenticación requerida' });
        return;
    }

    const params = idParamsSchema.safeParse(req.params);
    const body = submitSchema.safeParse(req.body);

    if (!params.success || !body.success) {
        res.status(400).json({ error: 'Solicitud no válida' });
        return;
    }

    try {
        await submitSurveyResponse(actor, params.data.id, body.data.answers);

        res.status(204).end();
    } catch (e) {
        if (e instanceof SurveyError) {
            const [status, error] = surveyErrors[e.reason];

            res.status(status).json({ error });
            return;
        }

        throw e;
    }
});

// Constructor de encuestas
surveysRouter.get(
    '/',
    requirePermission('surveys:manage'),
    async (_req, res) => {
        const surveys = await listSurveys();

        res.json({ surveys });
    },
);

surveysRouter.get(
    '/assignable-users',
    requirePermission('surveys:manage'),
    async (_req, res) => {
        const users = await listAssignableUsers();

        res.json({ users });
    },
);

surveysRouter.get(
    '/:id',
    requirePermission('surveys:manage'),
    async (req, res) => {
        const params = idParamsSchema.safeParse(req.params);

        if (!params.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        try {
            const survey = await getSurveyWithQuestions(params.data.id);

            res.json({ survey });
        } catch (e) {
            if (e instanceof SurveyError) {
                const [status, error] = surveyErrors[e.reason];

                res.status(status).json({ error });
                return;
            }

            throw e;
        }
    },
);

surveysRouter.get(
    '/:id/results',
    requirePermission('surveys:manage'),
    async (req, res) => {
        const params = idParamsSchema.safeParse(req.params);

        if (!params.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        try {
            const results = await getSurveyResults(params.data.id);

            res.json({ results });
        } catch (e) {
            if (e instanceof SurveyError) {
                const [status, error] = surveyErrors[e.reason];

                res.status(status).json({ error });
                return;
            }

            throw e;
        }
    },
);

surveysRouter.post(
    '/',
    requirePermission('surveys:manage'),
    async (req, res) => {
        const actor = req.user;

        if (!actor) {
            res.status(401).json({ error: 'Autenticación requerida' });
            return;
        }

        const body = surveySchema.safeParse(req.body);

        if (!body.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        try {
            const survey = await createSurvey(
                actor,
                body.data.title,
                body.data.questions,
                body.data.ownerId,
                body.data.scheduledStartAt
                    ? new Date(body.data.scheduledStartAt)
                    : undefined,
                body.data.scheduledEndAt
                    ? new Date(body.data.scheduledEndAt)
                    : undefined,
            );

            res.status(201).json({ survey });
        } catch (e) {
            if (e instanceof SurveyError) {
                const [status, error] = surveyErrors[e.reason];

                res.status(status).json({ error });
                return;
            }

            throw e;
        }
    },
);

surveysRouter.patch(
    '/:id',
    requirePermission('surveys:manage'),
    async (req, res) => {
        const actor = req.user;

        if (!actor) {
            res.status(401).json({ error: 'Autenticación requerida' });
            return;
        }

        const params = idParamsSchema.safeParse(req.params);
        const body = surveySchema.safeParse(req.body);

        if (!params.success || !body.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        try {
            await updateSurvey(
                actor,
                params.data.id,
                body.data.title,
                body.data.questions,
                body.data.ownerId,
                body.data.scheduledStartAt
                    ? new Date(body.data.scheduledStartAt)
                    : undefined,
                body.data.scheduledEndAt
                    ? new Date(body.data.scheduledEndAt)
                    : undefined,
            );

            res.status(204).end();
        } catch (e) {
            if (e instanceof SurveyError) {
                const [status, error] = surveyErrors[e.reason];

                res.status(status).json({ error });
                return;
            }

            throw e;
        }
    },
);

surveysRouter.post(
    '/:id/activate',
    requirePermission('surveys:manage'),
    async (req, res) => {
        const actor = req.user;

        if (!actor) {
            res.status(401).json({ error: 'Autenticación requerida' });
            return;
        }

        const params = idParamsSchema.safeParse(req.params);

        if (!params.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        try {
            await activateSurvey(actor, params.data.id);

            res.status(204).end();
        } catch (e) {
            if (e instanceof SurveyError) {
                const [status, error] = surveyErrors[e.reason];

                res.status(status).json({ error });
                return;
            }

            throw e;
        }
    },
);

surveysRouter.post(
    '/:id/close',
    requirePermission('surveys:manage'),
    async (req, res) => {
        const actor = req.user;

        if (!actor) {
            res.status(401).json({ error: 'Autenticación requerida' });
            return;
        }

        const params = idParamsSchema.safeParse(req.params);

        if (!params.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        try {
            await closeSurvey(actor, params.data.id);

            res.status(204).end();
        } catch (e) {
            if (e instanceof SurveyError) {
                const [status, error] = surveyErrors[e.reason];

                res.status(status).json({ error });
                return;
            }

            throw e;
        }
    },
);

surveysRouter.delete(
    '/:id',
    requirePermission('surveys:manage'),
    async (req, res) => {
        const actor = req.user;

        if (!actor) {
            res.status(401).json({ error: 'Autenticación requerida' });
            return;
        }

        const params = idParamsSchema.safeParse(req.params);

        if (!params.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        try {
            await deleteSurvey(actor, params.data.id);

            res.status(204).end();
        } catch (e) {
            if (e instanceof SurveyError) {
                const [status, error] = surveyErrors[e.reason];

                res.status(status).json({ error });
                return;
            }

            throw e;
        }
    },
);
