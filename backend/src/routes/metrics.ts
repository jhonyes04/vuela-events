import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { getMetrics } from '../services/metrics.js';

export const metricsRouter = Router();

metricsRouter.use(requireAuth, requirePermission('metrics:view'));

const querySchema = z.object({
    days: z.coerce.number().int().positive().optional(),
});

metricsRouter.get('/', async (req, res) => {
    const query = querySchema.safeParse(req.query);

    if (!query.success) {
        res.status(400).json({ error: 'Solicitud no válida' });
        return;
    }

    res.json(await getMetrics(new Date(), query.data.days ?? 30));
});
