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
} from '../services/appSettings.js';

const userMenuStyleSchema = z.strictObject({
    userMenuStyle: z.enum(['dropdown', 'sheet']),
});

const maintenanceModeSchema = z.strictObject({
    maintenanceMode: z.boolean(),
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
