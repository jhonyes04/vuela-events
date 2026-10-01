import { OAuth2Client, type TokenPayload } from 'google-auth-library';
import { env } from '../config/env.js';

export type LoginRejection =
    | 'invalid_token'
    | 'unverified_email'
    | 'domain_not_allowed';

export class LoginRejectedError extends Error {
    readonly reason: LoginRejection;

    constructor(reason: LoginRejection) {
        super(reason);

        this.name = 'LoginRejectedError';
        this.reason = reason;
    }
}

export interface GoogleIdentity {
    sub: string;
    email: string;
    name: string;
    lastName: string;
    picture?: string;
}

export function identityFromPayload(
    payload: TokenPayload | undefined,
    expectedNonce: string,
): GoogleIdentity {
    if (!payload?.sub || !payload.email) {
        throw new LoginRejectedError('invalid_token');
    }

    // El token debe haberse emitido para ESTA sesión del navegador (anti replay).
    if (!expectedNonce || payload.nonce !== expectedNonce) {
        throw new LoginRejectedError('invalid_token');
    }

    if (payload.email_verified !== true) {
        throw new LoginRejectedError('unverified_email');
    }

    const email = payload.email.trim().toLowerCase();
    const isSuperadmin =
        env.SUPERADMIN_EMAIL !== undefined && email === env.SUPERADMIN_EMAIL;

    if (!isSuperadmin) {
        const emailDomain = email.slice(email.lastIndexOf('@') + 1);
        const workspaceDomain = payload.hd?.trim().toLowerCase();

        if (
            emailDomain !== env.ALLOWED_EMAIL_DOMAIN ||
            workspaceDomain !== env.ALLOWED_EMAIL_DOMAIN
        ) {
            throw new LoginRejectedError('domain_not_allowed');
        }
    }

    const name = (payload.name?.trim() || email.split('@')[0]) ?? email;
    const lastName = (payload.family_name?.trim() || '').slice(0, 200);
    const picture = payload.picture?.trim() || undefined;

    return {
        sub: payload.sub,
        email,
        name: name.slice(0, 200),
        lastName,
        picture,
    };
}

const client = new OAuth2Client();

export async function verifyGoogleIdToken(
    idToken: string,
    expectedNonce: string,
): Promise<GoogleIdentity> {
    let payload: TokenPayload | undefined;

    try {
        const ticket = await client.verifyIdToken({
            idToken,
            audience: env.GOOGLE_CLIENT_ID,
        });

        payload = ticket.getPayload();
    } catch {
        throw new LoginRejectedError('invalid_token');
    }

    return identityFromPayload(payload, expectedNonce);
}
