import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import {
    PROJECT_COLORS,
    ProjectManageError,
    createProject,
    deleteProject,
    listProjects,
    updateProject,
} from '../services/projects.js';
import {
    addProjectPreference,
    ProjectPreferenceError,
    listAilUsers,
    listProjectInterestedUsers,
    removeProjectPreference,
} from '../services/projectPreferences.js';

const idParamSchema = z.object({ id: z.uuid() });
const projectUserParamsSchema = z.object({
    id: z.uuid(),
    userId: z.uuid(),
});
const addInterestedUserSchema = z.strictObject({ userId: z.uuid() });

const createProjectSchema = z.strictObject({
    name: z.string().trim().min(2).max(80),
    color: z.enum(PROJECT_COLORS),
});

const updateProjectSchema = z.strictObject({
    name: z.string().trim().min(2).max(80),
    color: z.enum(PROJECT_COLORS),
    active: z.boolean(),
});

const projectManageErrors = {
    duplicate: [409, 'Ya existe un proyecto con ese nombre'],
    not_found: [404, 'Proyecto no encontrado'],
    has_events: [409, 'No se puede eliminar: hay eventos con este proyecto'],
} as const;

export const projectsRouter = Router();

projectsRouter.use(requireAuth);

projectsRouter.get(
    '/',
    requirePermission(
        'projects:view',
        'projects:create',
        'projects:edit',
        'projects:delete',
        // El formulario de eventos necesita elegir proyecto.
        'events:create',
        'events:edit',
    ),
    async (_req, res) => {
        const projects = await listProjects();

        res.json({ projects });
    },
);

projectsRouter.get(
    '/interested-users',
    requirePermission('projects:view'),
    async (_req, res) => {
        res.json({ projects: await listProjectInterestedUsers() });
    },
);

projectsRouter.get(
    '/ail-users',
    requirePermission('projects:edit'),
    async (_req, res) => {
        res.json({ users: await listAilUsers() });
    },
);

projectsRouter.post(
    '/:id/interested-users',
    requirePermission('projects:edit'),
    async (req, res) => {
        const params = idParamSchema.safeParse(req.params);
        const body = addInterestedUserSchema.safeParse(req.body);

        if (!params.success || !body.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        try {
            await addProjectPreference(body.data.userId, params.data.id);
            res.json({ projects: await listProjectInterestedUsers() });
        } catch (e) {
            if (e instanceof ProjectPreferenceError) {
                res.status(400).json({
                    error: 'Usuario o proyecto no válidos',
                });
                return;
            }

            throw e;
        }
    },
);

projectsRouter.delete(
    '/:id/interested-users/:userId',
    requirePermission('projects:delete'),
    async (req, res) => {
        const params = projectUserParamsSchema.safeParse(req.params);

        if (!params.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        await removeProjectPreference(params.data.userId, params.data.id);
        res.json({ projects: await listProjectInterestedUsers() });
    },
);

projectsRouter.post(
    '/',
    requirePermission('projects:create'),
    async (req, res) => {
        const actor = req.user;

        if (!actor) {
            res.status(401).json({ error: 'Autenticación requerida' });
            return;
        }

        const body = createProjectSchema.safeParse(req.body);

        if (!body.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        try {
            const project = await createProject(
                actor.id,
                body.data.name,
                body.data.color,
            );

            res.status(201).json({ project });
        } catch (e) {
            if (e instanceof ProjectManageError) {
                const [status, error] = projectManageErrors[e.reason];

                res.status(status).json({ error });
                return;
            }

            throw e;
        }
    },
);

projectsRouter.patch(
    '/:id',
    requirePermission('projects:edit'),
    async (req, res) => {
        const actor = req.user;

        if (!actor) {
            res.status(401).json({ error: 'Autenticación requerida' });
            return;
        }

        const params = idParamSchema.safeParse(req.params);
        const body = updateProjectSchema.safeParse(req.body);

        if (!params.success || !body.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        try {
            const project = await updateProject(
                actor.id,
                params.data.id,
                body.data,
            );

            res.json({ project });
        } catch (e) {
            if (e instanceof ProjectManageError) {
                const [status, error] = projectManageErrors[e.reason];

                res.status(status).json({ error });
                return;
            }

            throw e;
        }
    },
);

projectsRouter.delete(
    '/:id',
    requirePermission('projects:delete'),
    async (req, res) => {
        const actor = req.user;

        if (!actor) {
            res.status(401).json({ error: 'Autenticación requerida' });
            return;
        }

        const params = idParamSchema.safeParse(req.params);

        if (!params.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        try {
            await deleteProject(actor.id, params.data.id);
            res.status(204).end();
        } catch (e) {
            if (e instanceof ProjectManageError) {
                const [status, error] = projectManageErrors[e.reason];

                res.status(status).json({ error });
                return;
            }

            throw e;
        }
    },
);
