import { Router } from 'express';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { getStats } from '../services/stats.js';

export const statsRouter = Router();

// Solo lectura agregada: admin y dt (permiso stats:view).
statsRouter.use(requireAuth, requirePermission('stats:view'));

statsRouter.get('/', async (_req, res) => {
    res.json(await getStats());
});
