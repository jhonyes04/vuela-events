import { createHmac, randomBytes } from 'node:crypto';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { SESSION_COOKIE, sessionPool } from '../middleware/session.js';
import { createApp, type AppOptions } from '../app.js';
import type { AddressInfo } from 'node:net';

// Estos helpers BORRAN datos: sólo pueden ejecutarse contra una base "_test"
if (
    env.NODE_ENV !== 'test' ||
    !new URL(env.DATABASE_URL).pathname.endsWith('_test')
) {
    throw new Error(
        'Los tests de integración sólo se ejecutan con NODE_ENV=test y una base de datos "_test"',
    );
}

export const resetDb = async (): Promise<void> => {
    await prisma.$executeRaw`TRUNCATE TABLE "audit_logs", "registrations", "events", "categories", "guides", "users", "session" RESTART IDENTITY CASCADE`;
};

export const closeDb = async (): Promise<void> => {
    await Promise.allSettled([prisma.$disconnect(), sessionPool.end()]);
};

// Por defecto crea usuarios con el perfil COMPLETO (así pueden inscribirse y crear
// eventos); con profileCompleted: false se simula el primer acceso.
export const createUser = (
    roleId: string,
    opts: { active?: boolean; email?: string; profileCompleted?: boolean } = {},
) => {
    const n = randomBytes(4).toString('hex');
    const completed = opts.profileCompleted ?? true;

    return prisma.user.create({
        data: {
            email: opts.email ?? `${roleId}-${n}@${env.ALLOWED_EMAIL_DOMAIN}`,
            googleSub: `sub-${n}`,
            name: `${roleId} ${n}`,
            lastName: `Apellido ${n}`,
            puntoVuela: completed ? `Punto ${n}` : null,
            dinamizadorTitle: completed ? 'dinamizador' : null,
            profileCompletedAt: completed ? new Date() : null,
            roleId,
            active: opts.active ?? true,
        },
    });
};

// Proyecto de prueba: por defecto activo, para poder usarlo al crear eventos.
export const createProject = (
    opts: { name?: string; color?: string; active?: boolean } = {},
) => {
    const n = randomBytes(4).toString('hex');

    return prisma.category.create({
        data: {
            name: opts.name ?? `Proyecto ${n}`,
            color: opts.color ?? 'amber',
            active: opts.active ?? true,
        },
    });
};

// Guía de prueba: por defecto activa, para poder usarla al crear eventos.
export const createGuide = (
    opts: { name?: string; url?: string; active?: boolean } = {},
) => {
    const n = randomBytes(4).toString('hex');

    return prisma.guide.create({
        data: {
            name: opts.name ?? `Guía ${n}`,
            url: opts.url ?? `https://example.com/guia-${n}`,
            active: opts.active ?? true,
        },
    });
};

// Simula un login: inserta la sesión y devuelve la cookie firmada como lo hace express-session
export const sessionCookieFor = async (userId: string): Promise<string> => {
    const sid = randomBytes(24).toString('base64url');
    const maxAge = 8 * 60 * 60 * 1000;
    const sess = JSON.stringify({
        cookie: {
            originalMaxAge: maxAge,
            expires: new Date(Date.now() + maxAge).toISOString(),
            httpOnly: true,
            path: '/',
            sameSite: 'lax',
            secure: false,
        },
        userId,
    });

    await prisma.$executeRaw`INSERT INTO "session" ("sid", "sess", "expire") VALUES (${sid}, ${sess}::json, now() + interval '8 hours')`;

    const signature = createHmac('sha256', env.SESSION_SECRET)
        .update(sid)
        .digest('base64')
        .replace(/=+$/, '');

    return `${SESSION_COOKIE}=${encodeURIComponent(`s:${sid}.${signature}`)}`;
};

export const startServer = async (options: AppOptions = {}) => {
    const server = createApp(options).listen(0);

    await new Promise<void>((resolve) => server.once('listening', resolve));

    const { port } = server.address() as AddressInfo;

    return {
        baseUrl: `http://127.0.0.1:${port}`,
        close: () =>
            new Promise<void>((resolve, reject) => {
                server.close((err) => (err ? reject(err) : resolve()));
            }),
    };
};

interface ApiOptions {
    cookie?: string;
    body?: unknown;
    origin?: string | null;
}

export const api = async (
    baseUrl: string,
    method: string,
    path: string,
    { cookie, body, origin = env.FRONTEND_ORIGIN }: ApiOptions = {},
): Promise<{ status: number; body: any; setCookie: string[] }> => {
    const headers: Record<string, string> = {};

    if (origin) headers['Origin'] = origin;
    if (cookie) headers['Cookie'] = cookie;
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    const res = await fetch(`${baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
    });

    const text = await res.text();

    return {
        status: res.status,
        body: text ? JSON.parse(text) : null,
        setCookie: res.headers.getSetCookie(),
    };
};
