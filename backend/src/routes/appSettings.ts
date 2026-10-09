import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { getAppSettings, setUserMenuStyle } from '../services/appSettings.js';

const userMenuStyleSchema = z.strictObject({
    userMenuStyle: z.enum(['dropdown', 'sheet']),
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
