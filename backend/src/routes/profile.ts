import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import {
    updateProfile,
    setAppPassword,
    clearAppPassword,
} from '../services/profile.js';

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
});

const appPasswordSchema = z.strictObject({
    password: z.string().min(1).max(200),
});

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

    const user = await updateProfile(actor.id, body.data);

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
