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
    invalidateMaintenanceModeCache,
    sendMaintenanceNotice,
} from '../services/appSettings.js';

const userMenuStyleSchema = z.strictObject({
    userMenuStyle: z.enum(['dropdown', 'sheet']),
});

const maintenanceModeSchema = z.strictObject({
    maintenanceMode: z.boolean(),
});

const maintenanceNoticeSchema = z.strictObject({
    from: z.iso.datetime(),
    to: z.iso.datetime(),
    reason: z.string().trim().min(1).max(500),
});

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

appSettingsRouter.post(
    '/maintenance-notice',
    requireSuperadmin,
    async (req, res) => {
        const body = maintenanceNoticeSchema.safeParse(req.body);

        if (!body.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        try {
            await sendMaintenanceNotice(
                new Date(body.data.from),
                new Date(body.data.to),
                body.data.reason,
            );
        } catch {
            res.status(400).json({
                error: 'No se pudo enviar el aviso (¿hay plantilla asignada?)',
            });

            return;
        }

        res.status(204).end();
    },
);
