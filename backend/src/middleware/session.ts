import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import pg from 'pg';
import { env, isProd } from '../config/env.js';

declare module 'express-session' {
    interface SessionData {
        userId: string;
    }
}

const PgStore = connectPgSimple(session);

export const sessionPool = new pg.Pool({
    connectionString: env.DATABASE_URL,
    max: 3,
});

export const SESSION_COOKIE = 'vuela.sid';
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
