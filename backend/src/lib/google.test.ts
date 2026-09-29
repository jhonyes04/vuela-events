import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { TokenPayload } from 'google-auth-library';
import { env } from '../config/env.js';
import {
    identityFromPayload as identityFrom,
    LoginRejectedError,
} from './google.js';

const D = env.ALLOWED_EMAIL_DOMAIN;
const NONCE = 'nonce-de-prueba';

const identityFromPayload = (p: TokenPayload | undefined) =>
    identityFrom(p, NONCE);

const payload = (overrides: Partial<TokenPayload> = {}): TokenPayload => {
    return {
        iss: 'https://accounts.google.com',
        aud: 'test',
        sub: '123',
        iat: 0,
        exp: 0,
        email: `ana@${D}`,
        email_verified: true,
        hd: D,
        name: 'Ana',
        nonce: NONCE,
        ...overrides,
    };
};

const assertRejected = (p: TokenPayload | undefined, reason: string) => {
    assert.throws(
        () => identityFromPayload(p),
        (e) => e instanceof LoginRejectedError && e.reason === reason,
    );
};

describe('identityFromPayload', () => {
    it('acepta una cuenta válida del dominio', () => {
        assert.deepEqual(identityFromPayload(payload()), {
            sub: '123',
            email: `ana@${D}`,
            name: 'Ana',
            lastName: '',
        });
    });

    it('normaliza el email a minúsculas', () => {
        const id = identityFromPayload(
            payload({ email: `Ana@${D.toUpperCase()}` }),
        );

        assert.equal(id.email, `ana@${D}`);
    });

    it('usa la parte local del correo si no hay nombre', () => {
        assert.equal(
            identityFromPayload(payload({ name: undefined })).name,
            'ana',
        );
    });

    it('limita el nombre a 200 caracteres', () => {
        const id = identityFromPayload(payload({ name: 'a'.repeat(500) }));
        assert.equal(id.name.length, 200);
    });

    it('rechaza otro dominio (gmail.com)', () => {
        assertRejected(
            payload({ email: 'ana@gmail.com', hd: undefined }),
            'domain_not_allowed',
        );
    });

    it('rechaza dominio que sólo contiene el permitido al final', () => {
        assertRejected(
            payload({ email: `ana@${D}`, hd: `evil${D}` }),
            'domain_not_allowed',
        );
    });

    it('rechaza dominio que empieza por el permitido', () => {
        assertRejected(
            payload({ email: `ana@${D}.evil.com`, hd: `${D}.evil.com` }),
            'domain_not_allowed',
        );
    });

    it('rechaza subdominios', () => {
        assertRejected(
            payload({ email: `ana@sub.${D}`, hd: `sub.${D}` }),
            'domain_not_allowed',
        );
    });

    it('rechaza correo del dominio sin claim hd (cuenta no administrada)', () => {
        assertRejected(payload({ hd: undefined }), 'domain_not_allowed');
    });

    it('rechaza hd de otra organización aunque el correo coincida', () => {
        assertRejected(payload({ hd: 'evil.com' }), 'domain_not_allowed');
    });

    it('SUPERADMIN_EMAIL entra aunque el dominio/hd no coincidan', () => {
        const superadminEmail = env.SUPERADMIN_EMAIL;

        assert.ok(
            superadminEmail,
            'SUPERADMIN_EMAIL debe estar definido en .env',
        );

        const id = identityFromPayload(
            payload({ email: superadminEmail, hd: undefined }),
        );

        assert.equal(id.email, superadminEmail);
    });

    it('SUPERADMIN_EMAIL sigue exigiendo email verificado', () => {
        const superadminEmail = env.SUPERADMIN_EMAIL;

        assert.ok(
            superadminEmail,
            'SUPERADMIN_EMAIL debe estar definido en .env',
        );

        assertRejected(
            payload({
                email: superadminEmail,
                hd: undefined,
                email_verified: false,
            }),
            'unverified_email',
        );
    });

    it('SUPERADMIN_EMAIL sigue exigiendo el nonce', () => {
        const superadminEmail = env.SUPERADMIN_EMAIL;

        assert.ok(
            superadminEmail,
            'SUPERADMIN_EMAIL debe estar definido en .env',
        );

        assertRejected(
            payload({
                email: superadminEmail,
                hd: undefined,
                nonce: 'otro-nonce',
            }),
            'invalid_token',
        );
    });

    it('rechaza email no verificado', () => {
        assertRejected(payload({ email_verified: false }), 'unverified_email');
    });

    it('rechaza si email_verified no viene', () => {
        assertRejected(
            payload({ email_verified: undefined }),
            'unverified_email',
        );
    });

    it('rechaza payload vacío o incompleto', () => {
        assertRejected(undefined, 'invalid_token');
        assertRejected(payload({ email: undefined }), 'invalid_token');
        assertRejected(payload({ sub: '' }), 'invalid_token');
    });

    it('rechaza un token emitido para otro nonce (replay)', () => {
        assertRejected(payload({ nonce: 'otro-nonce' }), 'invalid_token');
    });

    it('rechaza un token sin nonce', () => {
        assertRejected(payload({ nonce: undefined }), 'invalid_token');
    });

    it('rechaza si el servidor no tiene nonce esperado', () => {
        assert.throws(
            () => identityFrom(payload(), ''),
            (e) =>
                e instanceof LoginRejectedError && e.reason === 'invalid_token',
        );
    });
});
