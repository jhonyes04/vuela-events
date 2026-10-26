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
    listEligibleUsers,
    listProjectInterestedUsers,
    removeProjectPreference,
} from '../services/projectPreferences.js';

const idParamSchema = z.object({ id: z.uuid() });
const projectUserParamsSchema = z.object({
    id: z.uuid(),
    userId: z.uuid(),
});
const addInterestedUserSchema = z.strictObject({ userId: z.uuid() });

const hexColorSchema = z
    .string()
    .regex(/^#[0-9a-f]{6}$/i, 'Color hex inválido');
const projectColorSchema = z.union([z.enum(PROJECT_COLORS), hexColorSchema]);

// Solo lo usa un admin para fijar al creador real cuando da de alta el
// proyecto en nombre de otro. Si lo manda cualquier otro rol, se ignora
// (ver resolveCreatedById en el servicio).
const ownerIdSchema = z.uuid().optional();

const createProjectSchema = z.strictObject({
    name: z.string().trim().min(2).max(80),
    openingInstructions: z.string().max(20000).nullable().optional(),
    closingInstructions: z.string().max(20000).nullable().optional(),
    color: projectColorSchema,
    guideIds: z.array(z.uuid()).min(1),
    resourceLinkIds: z.array(z.uuid()).default([]),
    documentIds: z.array(z.uuid()).default([]),
    ownerId: ownerIdSchema,
});

const updateProjectSchema = z.strictObject({
    name: z.string().trim().min(2).max(80),
    openingInstructions: z.string().max(20000).nullable(),
    closingInstructions: z.string().max(20000).nullable(),
    color: projectColorSchema,
    guideIds: z.array(z.uuid()).min(1),
    resourceLinkIds: z.array(z.uuid()).default([]),
    documentIds: z.array(z.uuid()).default([]),
    active: z.boolean(),
    ownerId: ownerIdSchema,
});

const projectManageErrors = {
    duplicate: [409, 'Ya existe un proyecto con ese nombre'],
    not_found: [404, 'Proyecto no encontrado'],
    has_events: [409, 'No se puede eliminar: hay eventos con este proyecto'],
    guide_not_found: [400, 'Guía no válida'],
    resource_link_not_found: [400, 'Recurso no válido'],
    document_not_found: [400, 'Documento no válido'],
    forbidden: [403, 'No puedes gestionar un proyecto que no creaste'],
    owner_not_found: [400, 'Propietario no válido'],
} as const;

export const projectsRouter = Router();

projectsRouter.use(requireAuth);

projectsRouter.get(
    '/',
    requirePermission(
        'projects:view',
        'projects:create',
        'projects:edit',
        'projects:edit:own',
        'projects:delete',
        'projects:delete:own',
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
    requirePermission('attendees:interests:view'),
    async (_req, res) => {
        res.json({ projects: await listProjectInterestedUsers() });
    },
);

projectsRouter.get(
    '/eligible-users',
    requirePermission('projects:edit'),
    async (_req, res) => {
        res.json({ users: await listEligibleUsers() });
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
                actor,
                body.data.name,
                body.data.openingInstructions ?? null,
                body.data.closingInstructions ?? null,
                body.data.color,
                body.data.guideIds,
                body.data.resourceLinkIds,
                body.data.documentIds,
                body.data.ownerId ?? null,
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
    requirePermission('projects:edit', 'projects:edit:own'),
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
                actor,
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
    requirePermission('projects:delete', 'projects:delete:own'),
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
            await deleteProject(actor, params.data.id);
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
