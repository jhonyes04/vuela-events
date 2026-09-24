import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import pg from 'pg';
import { env, isProd } from '../config/env.js';

declare module 'express-session' {
    interface SessionData {
        userId: string;
        // Valor de un solo uso que ata el id_token de Google a esta sesión.
        loginNonce: string;
    }
}

const PgStore = connectPgSimple(session);

export const sessionPool = new pg.Pool({
    connectionString: env.DATABASE_URL,
    max: 3,
});

// En producción el prefijo __Host- exige Secure, Path=/ y ausencia de Domain
export const SESSION_COOKIE = isProd ? '__Host-vuela.sid' : 'vuela.sid';

const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

export const sessionMiddleware = session({
    name: SESSION_COOKIE,
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: new PgStore({
        pool: sessionPool,
        tableName: 'session',
        createTableIfMissing: false,
    }),
    cookie: {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: SESSION_TTL_MS,
    },
});
