import { z } from 'zod';

const envSchema = z.object({
    NODE_ENV: z
        .enum(['development', 'test', 'production'])
        .default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3001),
    HOST: z.string().trim().min(1).default('0.0.0.0'),
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
    SUPERADMIN_EMAIL: z.email().toLowerCase().optional(),
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
});

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
