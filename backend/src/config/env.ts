import { z } from 'zod';

const envSchema = z
    .object({
        NODE_ENV: z
            .enum(['development', 'test', 'production'])
            .default('development'),
        PORT: z.coerce.number().int().min(1).max(65535).default(3001),
        DATABASE_URL: z.string().startsWith('postgres'),
        SESSION_SECRET: z
            .string()
            .min(32, 'SESSION_SECRET debe tener al menos 32 caracteres'),
        GOOGLE_CLIENT_ID: z.string().endsWith('.apps.googleusercontent.com'),
        ALLOWED_EMAIL_DOMAIN: z
            .string()
            .trim()
            .toLowerCase()
            .regex(/^[a-z0-9-]+(\.[a-z0-9-]+)+$/)
            .default('puntosvuela.es'),
        FRONTEND_ORIGIN: z.url(),
        INITIAL_ADMIN_EMAIL: z.email().toLowerCase().optional(),
    })
    .refine(
        (e) =>
            !e.INITIAL_ADMIN_EMAIL ||
            e.INITIAL_ADMIN_EMAIL.endsWith(`@${e.ALLOWED_EMAIL_DOMAIN}`),
        {
            path: ['INITIAL_ADMIN_EMAIL'],
            message: 'Debe pertenecer al dominio permitido',
        },
    );

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error('Configuración de entorno no válida');

    for (const issue of parsed.error.issues) {
        console.error(` - ${issue.path.join('.')}: ${issue.message}`);
    }

    process.exit(1);
}

export const env = Object.freeze(parsed.data);
export const isProd = env.NODE_ENV === 'production';
