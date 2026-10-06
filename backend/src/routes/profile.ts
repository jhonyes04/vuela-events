import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import {
    updateProfile,
    setAppPassword,
    clearAppPassword,
    setSignatureImage,
    clearSignatureImage,
    getSignatureImage,
} from '../services/profile.js';
import {
    getEmailSignature,
    saveEmailSignature,
    addEmailSignatureImage,
    getEmailSignatureImage,
} from '../services/emailSignature.js';
import { getSentReportPdf, listSentReports } from '../services/sentReports.js';
import { DINAMIZADOR_TITLES } from '../lib/authUser.js';

// Firma la genera cualquier lector de imágenes normal: cabe de sobra en 300KB.
const MAX_SIGNATURE_BYTES = 300 * 1024;
const PNG_SIGNATURE = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

// Sin caracteres de control ni de formato (\p{C}) y sin < ni >.
const NO_CONTROL_OR_TAGS = /^[^\p{C}<>]+$/u;

// Recorta y colapsa los espacios internos: "  Ana   García " -> "Ana García".
const cleaned = (min: number, max: number) =>
    z
        .string()
        .transform((value) => value.trim().replace(/\s+/g, ' '))
        .pipe(
            z
                .string()
                .min(min)
                .max(max)
                .regex(NO_CONTROL_OR_TAGS)
                // Debe contener al menos una letra o un número.
                .regex(/[\p{L}\p{N}]/u),
        );

// strictObject: solo estos dos campos. No se puede colar role, active, email...
const profileSchema = z.strictObject({
    name: cleaned(2, 200),
    lastName: cleaned(2, 200),
    puntoVuela: cleaned(2, 120),
    dinamizadorTitle: z.enum(DINAMIZADOR_TITLES).nullable(),
});

const appPasswordSchema = z.strictObject({
    password: z.string().min(1).max(200),
});

const signatureSchema = z.strictObject({
    imageBase64: z.string().min(1),
});

const emailSignatureSchema = z.strictObject({
    html: z.string().max(20_000),
});

const emailSignatureImageSchema = z.strictObject({
    contentType: z.enum(['image/png', 'image/jpeg', 'image/webp']),
    dataBase64: z.string().min(1),
});

const imageParamsSchema = z.object({ id: z.uuid() });

const MAX_EMAIL_SIGNATURE_IMAGE_BYTES = 300 * 1024;
const JPEG_SIGNATURE = Buffer.from([0xff, 0xd8, 0xff]);

const isWebp = (buf: Buffer): boolean =>
    buf.length >= 12 &&
    buf.toString('ascii', 0, 4) === 'RIFF' &&
    buf.toString('ascii', 8, 12) === 'WEBP';

const matchesContentType = (buf: Buffer, contentType: string): boolean => {
    if (contentType === 'image/png')
        return buf.subarray(0, 8).equals(PNG_SIGNATURE);
    if (contentType === 'image/jpeg')
        return buf.subarray(0, 3).equals(JPEG_SIGNATURE);
    if (contentType === 'image/webp') return isWebp(buf);
    return false;
};

const reportsQuerySchema = z.object({
    q: z.string().trim().max(120).optional(),
});

const reportParamsSchema = z.object({ id: z.uuid() });

export const profileRouter = Router();

// Cada persona edita SOLO su propio perfil: la ruta no lleva id.
profileRouter.patch('/', requireAuth, async (req, res) => {
    const actor = req.user;

    if (!actor) {
        res.status(401).json({ error: 'Autenticación requerida' });
        return;
    }

    const body = profileSchema.safeParse(req.body);

    if (!body.success) {
        res.status(400).json({ error: 'Solicitud no válida' });
        return;
    }

    // Solo quien envía correos firma actas: el cargo es obligatorio para ellos
    // (salvo admin) y en el resto nunca se guarda.
    const needsTitle =
        actor.roleId !== 'admin' && actor.permissions.includes('email:send');
    const dinamizadorTitle = needsTitle ? body.data.dinamizadorTitle : null;

    if (needsTitle && dinamizadorTitle === null) {
        res.status(400).json({ error: 'Solicitud no válida' });
        return;
    }

    const user = await updateProfile(actor.id, {
        ...body.data,
        dinamizadorTitle,
    });

    res.json({ user });
});

// Solo quien puede enviar correos guarda su propia contraseña de aplicación.
profileRouter.patch(
    '/smtp-app-password',
    requireAuth,
    requirePermission('email:send'),
    async (req, res) => {
        const actor = req.user;

        if (!actor) {
            res.status(401).json({ error: 'Autenticación requerida' });
            return;
        }

        const body = appPasswordSchema.safeParse(req.body);

        if (!body.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        await setAppPassword(actor.id, body.data.password);

        res.json({ configured: true });
    },
);

profileRouter.delete(
    '/smtp-app-password',
    requireAuth,
    requirePermission('email:send'),
    async (req, res) => {
        const actor = req.user;

        if (!actor) {
            res.status(401).json({ error: 'Autenticación requerida' });
            return;
        }

        await clearAppPassword(actor.id);

        res.json({ configured: false });
    },
);

// Solo quien puede enviar correos sube su propia imagen de firma.
profileRouter.patch(
    '/signature',
    requireAuth,
    requirePermission('email:send'),
    async (req, res) => {
        const actor = req.user;

        if (!actor) {
            res.status(401).json({ error: 'Autenticación requerida' });
            return;
        }

        const body = signatureSchema.safeParse(req.body);

        if (!body.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        let image: Buffer;

        try {
            image = Buffer.from(body.data.imageBase64, 'base64');
        } catch {
            res.status(400).json({ error: 'Imagen no válida' });
            return;
        }

        if (
            image.length === 0 ||
            image.length > MAX_SIGNATURE_BYTES ||
            !image.subarray(0, 8).equals(PNG_SIGNATURE)
        ) {
            res.status(400).json({
                error: 'La imagen debe ser un PNG de menos de 300KB',
            });
            return;
        }

        await setSignatureImage(actor.id, image);

        res.json({ configured: true });
    },
);

profileRouter.delete(
    '/signature',
    requireAuth,
    requirePermission('email:send'),
    async (req, res) => {
        const actor = req.user;

        if (!actor) {
            res.status(401).json({ error: 'Autenticación requerida' });
            return;
        }

        await clearSignatureImage(actor.id);

        res.json({ configured: false });
    },
);

// Para previsualizarla en el propio perfil: cada persona solo ve la suya.
profileRouter.get('/signature-image', requireAuth, async (req, res) => {
    const actor = req.user;

    if (!actor) {
        res.status(401).json({ error: 'Autenticación requerida' });
        return;
    }

    const image = await getSignatureImage(actor.id);

    if (!image) {
        res.status(404).json({ error: 'No hay firma configurada' });
        return;
    }

    res.setHeader('Content-Type', 'image/png');
    res.send(image);
});

profileRouter.get(
    '/email-signature',
    requireAuth,
    requirePermission('email:send'),
    async (req, res) => {
        const actor = req.user;

        if (!actor) {
            res.status(401).json({ error: 'Autenticación requerida' });
            return;
        }

        res.json({ html: await getEmailSignature(actor.id) });
    },
);

profileRouter.patch(
    '/email-signature',
    requireAuth,
    requirePermission('email:send'),
    async (req, res) => {
        const actor = req.user;

        if (!actor) {
            res.status(401).json({ error: 'Autenticación requerida' });
            return;
        }

        const body = emailSignatureSchema.safeParse(req.body);

        if (!body.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        res.json({ html: await saveEmailSignature(actor.id, body.data.html) });
    },
);

profileRouter.post(
    '/email-signature/images',
    requireAuth,
    requirePermission('email:send'),
    async (req, res) => {
        const actor = req.user;

        if (!actor) {
            res.status(401).json({ error: 'Autenticación requerida' });
            return;
        }

        const body = emailSignatureImageSchema.safeParse(req.body);

        if (!body.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        let data: Buffer;

        try {
            data = Buffer.from(body.data.dataBase64, 'base64');
        } catch {
            res.status(400).json({ error: 'Imagen no válida' });
            return;
        }

        if (
            data.length === 0 ||
            data.length > MAX_EMAIL_SIGNATURE_IMAGE_BYTES ||
            !matchesContentType(data, body.data.contentType)
        ) {
            res.status(400).json({
                error: 'La imagen debe ser PNG, JPG o WebP de menos de 300KB',
            });
            return;
        }

        const id = await addEmailSignatureImage(
            actor.id,
            body.data.contentType,
            data,
        );

        res.status(201).json({
            id,
            url: `/api/profile/email-signature-images/${id}`,
        });
    },
);

profileRouter.get(
    '/email-signature-images/:id',
    requireAuth,
    requirePermission('email:send'),
    async (req, res) => {
        const actor = req.user;
        const params = imageParamsSchema.safeParse(req.params);

        if (!actor) {
            res.status(401).json({ error: 'Autenticación requerida' });
            return;
        }

        if (!params.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        const image = await getEmailSignatureImage(actor.id, params.data.id);

        if (!image) {
            res.status(404).json({ error: 'Imagen no encontrada' });
            return;
        }

        res.setHeader('Cache-Control', 'private, max-age=86400');
        res.setHeader('Content-Type', image.contentType);
        res.send(image.data);
    },
);

// El avatar viene de Google; aquí solo se previsualiza el que ya se descargó.
profileRouter.get('/avatar-image', requireAuth, async (req, res) => {
    const actor = req.user;

    if (!actor) {
        res.status(401).json({ error: 'Autenticación requerida' });
        return;
    }

    const row = await prisma.user.findUnique({
        where: { id: actor.id },
        select: { avatarImage: true, avatarImageType: true },
    });

    if (!row?.avatarImage) {
        res.status(404).json({ error: 'No hay avatar configurado' });
        return;
    }

    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Content-Type', row.avatarImageType ?? 'image/jpeg');
    res.send(Buffer.from(row.avatarImage));
});

// Partes de firmas enviados por mí o recibidos por mí, del más reciente al más antiguo.
profileRouter.get('/reports', requireAuth, async (req, res) => {
    const actor = req.user;

    if (!actor) {
        res.status(401).json({ error: 'Autenticación requerida' });
        return;
    }

    const query = reportsQuerySchema.safeParse(req.query);

    if (!query.success) {
        res.status(400).json({ error: 'Solicitud no válida' });
        return;
    }

    res.json({ reports: await listSentReports(actor.id, query.data.q) });
});

// Descarga el acta original (la que se adjuntó al correo).
profileRouter.get('/reports/:id/pdf', requireAuth, async (req, res) => {
    const actor = req.user;
    const params = reportParamsSchema.safeParse(req.params);

    if (!actor) {
        res.status(401).json({ error: 'Autenticación requerida' });
        return;
    }

    if (!params.success) {
        res.status(400).json({ error: 'Solicitud no válida' });
        return;
    }

    const report = await getSentReportPdf(actor.id, params.data.id);

    if (!report) {
        res.status(404).json({ error: 'Acta no encontrada' });
        return;
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader(
        'Content-Disposition',
        "attachment; filename*=UTF-8''" + encodeURIComponent(report.filename),
    );
    res.send(report.pdf);
});
