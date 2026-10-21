import { Router } from 'express';
import { z } from 'zod';
import {
    requireAuth,
    requirePermission,
    requireSuperadmin,
} from '../middleware/auth.js';
import {
    getAppSettings,
    setUserMenuStyle,
    setMaintenanceMode,
    setProjectSections,
    invalidateMaintenanceModeCache,
} from '../services/appSettings.js';
import {
    getMaintenanceNoticeJob,
    startMaintenanceNotice,
    StartMaintenanceNoticeError,
} from '../services/maintenanceNoticeJob.js';

const userMenuStyleSchema = z.strictObject({
    userMenuStyle: z.enum(['dropdown', 'sheet']),
});

const maintenanceModeSchema = z.strictObject({
    maintenanceMode: z.boolean(),
});

const projectSectionsSchema = z.strictObject({
    projectOpeningSections: z.array(z.string().trim().min(1)).min(1),
    projectClosingSections: z.array(z.string().trim().min(1)).min(1),
});

const maintenanceNoticeSchema = z.strictObject({
    from: z.iso.datetime(),
    to: z.iso.datetime(),
    reason: z.string().trim().min(1).max(5_000),
});

const jobIdParamsSchema = z.object({ jobId: z.uuid() });

const startMaintenanceNoticeErrors = {
    template_not_assigned: [
        409,
        'No hay ninguna plantilla asignada al aviso de mantenimiento',
    ],
    no_recipients: [400, 'No hay destinatarios activos'],
} as const;

export const appSettingsRouter = Router();

appSettingsRouter.use(requireAuth);

// Lectura abierta a cualquier autenticado: Header la necesita para decidir
// qué menú pintar, no es información sensible.
appSettingsRouter.get('/', async (_req, res) => {
    res.json(await getAppSettings());
});

appSettingsRouter.patch(
    '/user-menu-style',
    requirePermission('settings:manage'),
    async (req, res) => {
        const body = userMenuStyleSchema.safeParse(req.body);

        if (!body.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        res.json(await setUserMenuStyle(body.data.userMenuStyle));
    },
);

// Solo superadmin: no es un permiso de rol, es el mismo campo que decide
// quién puede seguir usando la app cuando está en mantenimiento.
appSettingsRouter.patch(
    '/maintenance-mode',
    requireSuperadmin,
    async (req, res) => {
        const body = maintenanceModeSchema.safeParse(req.body);

        if (!body.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        const result = await setMaintenanceMode(body.data.maintenanceMode);
        invalidateMaintenanceModeCache();

        res.json(result);
    },
);

appSettingsRouter.patch(
    '/project-sections',
    requirePermission('settings:manage'),
    async (req, res) => {
        const body = projectSectionsSchema.safeParse(req.body);

        if (!body.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        res.json(
            await setProjectSections(
                body.data.projectOpeningSections,
                body.data.projectClosingSections,
            ),
        );
    },
);

appSettingsRouter.post(
    '/maintenance-notice',
    requireSuperadmin,
    async (req, res) => {
        const actor = req.user;

        if (!actor) {
            res.status(401).json({ error: 'Autenticación requerida' });
            return;
        }

        const body = maintenanceNoticeSchema.safeParse(req.body);

        if (!body.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        try {
            const { jobId } = await startMaintenanceNotice(
                actor.id,
                new Date(body.data.from),
                new Date(body.data.to),
                body.data.reason,
            );

            res.status(202).json({ jobId });
        } catch (e) {
            if (e instanceof StartMaintenanceNoticeError) {
                const [status, error] = startMaintenanceNoticeErrors[e.reason];

                res.status(status).json({ error });
                return;
            }

            throw e;
        }
    },
);

appSettingsRouter.get('/maintenance-notice/:jobId', (req, res) => {
    const actor = req.user;

    if (!actor) {
        res.status(401).json({ error: 'Autenticación requerida' });
        return;
    }

    const params = jobIdParamsSchema.safeParse(req.params);

    if (!params.success) {
        res.status(400).json({ error: 'Solicitud no válida' });
        return;
    }

    const job = getMaintenanceNoticeJob(params.data.jobId, actor.id);

    if (!job) {
        res.status(404).json({ error: 'Envío no encontrado' });
        return;
    }

    res.json({ job });
});
