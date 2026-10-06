import { z } from 'zod';

const envSchema = z
    .object({
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
    })
    .superRefine((env, ctx) => {
        if (env.NODE_ENV !== 'production') {
            return;
        }

        if (!env.FRONTEND_ORIGIN.startsWith('https://')) {
            ctx.addIssue({
                code: 'custom',
                path: ['FRONTEND_ORIGIN'],
                message:
                    'En producción FRONTEND_ORIGIN debe empezar por https://',
            });
        }

        if (env.TRUST_PROXY_HOPS < 1) {
            ctx.addIssue({
                code: 'custom',
                path: ['TRUST_PROXY_HOPS'],
                message:
                    'En producción TRUST_PROXY_HOPS debe ser al menos 1 (proxy de Coolify)',
            });
        }

        if (env.SESSION_SECRET.includes('change-me')) {
            ctx.addIssue({
                code: 'custom',
                path: ['SESSION_SECRET'],
                message:
                    'En producción SESSION_SECRET no puede ser el valor de ejemplo',
            });
        }
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
