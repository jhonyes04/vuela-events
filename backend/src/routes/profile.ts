import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { updateProfile } from '../services/profile.js';

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
