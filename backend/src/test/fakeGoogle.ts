import type { TokenPayload } from 'google-auth-library';
import { env } from '../config/env.js';
import { identityFromPayload, LoginRejectedError } from '../lib/google.js';
import type { TokenVerifier } from '../routes/auth.js';
import { api } from './helpers.js';

export const D = env.ALLOWED_EMAIL_DOMAIN;

export const payload = (
    n: string,
    over: Partial<TokenPayload> = {},
): TokenPayload => ({
    iss: 'https://accounts.google.com',
    aud: 'test',
    sub: `sub-${n}`,
    iat: 0,
    exp: 0,
    email: `${n}@${D}`,
    email_verified: true,
    hd: D,
    name: `Usuario ${n}`,
    ...over,
});

// "Google" falso: en lugar de llamar a Google, busca la carga en una tabla,
// pero aplica las MISMAS reglas que producción (identityFromPayload), nonce incluido.
const tokens = new Map<string, TokenPayload>();

export const resetTokens = (): void => {
    tokens.clear();
};

export const tokenFor = (p: TokenPayload): string => {
    const token = `tok-${p.sub}-${tokens.size}-`.padEnd(30, 'x');

    tokens.set(token, p);

    return token;
};

export const verifyToken: TokenVerifier = async (credential, expectedNonce) => {
    const p = tokens.get(credential);

    if (!p) {
        throw new LoginRejectedError('invalid_token');
    }

    return identityFromPayload(p, expectedNonce);
};

export const cookieFrom = (res: { setCookie: string[] }): string =>
    res.setCookie.map((c) => c.split(';')[0]).join('; ');

// Pide un nonce. Devuelve también la cookie de la sesión donde quedó guardado.
export const getNonce = async (baseUrl: string, cookie?: string) => {
    const res = await api(baseUrl, 'GET', '/api/auth/nonce', { cookie });

    return {
        nonce: res.body.nonce as string,
        // Una sesión ya existente no vuelve a emitir cookie.
        cookie: cookieFrom(res) || cookie || '',
    };
};

export const postLogin = (
    baseUrl: string,
    credential: string,
    cookie?: string,
    extra: object = {},
    origin?: string | null,
) =>
    api(baseUrl, 'POST', '/api/auth/google', {
        cookie,
        body: { credential, ...extra },
        origin,
    });

// Flujo normal: pide nonce, "Google" firma el token con ese nonce y se envía
// con la cookie de la sesión anónima.
export const loginWith = async (
    baseUrl: string,
    p: TokenPayload,
    extra: object = {},
) => {
    const { nonce, cookie } = await getNonce(baseUrl);

    return postLogin(baseUrl, tokenFor({ ...p, nonce }), cookie, extra);
};

export const me = (baseUrl: string, cookie: string) =>
    api(baseUrl, 'GET', '/api/auth/me', { cookie });
