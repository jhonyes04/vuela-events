import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { getStats } from '../services/stats.js';

export const statsRouter = Router();

// Solo lectura agregada: admin y dt (permiso stats:view).
statsRouter.use(requireAuth, requirePermission('stats:view'));

const querySchema = z.object({ year: z.coerce.number().int().optional() });

statsRouter.get('/', async (req, res) => {
    const query = querySchema.safeParse(req.query);

    if (!query.success) {
        res.status(400).json({ error: 'Solicitud no válida' });
        return;
    }

    res.json(await getStats(new Date(), query.data.year ?? null));
});
