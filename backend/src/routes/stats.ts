import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { getStats } from '../services/stats.js';
import { PRINT_SECTION_IDS } from '../services/statsReportShared.js';
import { generateStatsReportFromImages } from '../services/statsReportFromImages.js';

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

const capturedImageSchema = z.object({
    // Hasta ~4.5 MB por captura en binario (base64 añade ~33%): de sobra
    // para un PNG a pixelRatio 2 de un gráfico.
    dataUrl: z.string().max(6_000_000),
    width: z.number().positive(),
    height: z.number().positive(),
});

const pdfImagesBodySchema = z.object({
    year: z.number().int().nullable(),
    images: z.record(z.enum(PRINT_SECTION_IDS), capturedImageSchema),
    kpiImages: z
        .object({
            events: capturedImageSchema,
            attended: capturedImageSchema,
        })
        .optional(),
});

// El frontend captura cada chart ya renderizado (Recharts) como PNG y lo
// sube aquí; el backend solo lo pega en el PDF.
statsRouter.post('/pdf-images', async (req, res) => {
    const body = pdfImagesBodySchema.safeParse(req.body);

    if (!body.success || Object.keys(body.data.images).length === 0) {
        res.status(400).json({ error: 'Solicitud no válida' });
        return;
    }

    const { pdf, filename } = await generateStatsReportFromImages({
        now: new Date(),
        year: body.data.year,
        images: body.data.images,
        kpiImages: body.data.kpiImages,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader(
        'Content-Disposition',
        "inline; filename*=UTF-8''" + encodeURIComponent(filename),
    );
    res.send(pdf);
});
