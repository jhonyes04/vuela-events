import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../lib/prisma.js';
import {
    api,
    closeDb,
    createUser,
    resetDb,
    sessionCookieFor,
    startServer,
} from './helpers.js';
import {
    cookieFrom,
    getNonce,
    me,
    payload,
    postLogin,
    resetTokens,
    tokenFor,
    verifyToken,
} from './fakeGoogle.js';

// Fichero aparte del login: el limitador de login es global al proceso.
describe('nonce anti-replay del login', () => {
    let server: Awaited<ReturnType<typeof startServer>>;

    before(async () => {
        server = await startServer({ verifyToken });
    });

    beforeEach(async () => {
        resetTokens();
        await resetDb();
    });

    after(async () => {
        await server.close();
        await closeDb();
    });

    it('GET /api/auth/nonce da un valor distinto cada vez y una cookie HttpOnly de vida corta', async () => {
        const a = await api(server.baseUrl, 'GET', '/api/auth/nonce');
        const b = await api(server.baseUrl, 'GET', '/api/auth/nonce');

        assert.notEqual(a.body.nonce, b.body.nonce);
        assert.ok(a.body.nonce.length >= 40, 'debe tener 256 bits de entropía');

        const raw = a.setCookie.find((c) => c.startsWith('vuela.sid='));

        assert.ok(raw);
        assert.match(raw, /HttpOnly/i);
        assert.match(raw, /Expires=/i);
    });

    it('token emitido para el nonce de otra sesión: 401 (replay entre sesiones)', async () => {
        const a = await getNonce(server.baseUrl);
        const b = await getNonce(server.baseUrl);

        // Token firmado con el nonce de A, pero enviado desde la sesión de B.
        const res = await postLogin(
            server.baseUrl,
            tokenFor({ ...payload('victima'), nonce: a.nonce }),
            b.cookie,
        );

        assert.equal(res.status, 401);
        assert.equal(res.setCookie.length, 0);
        assert.equal(await prisma.user.count(), 0);
    });

    it('token válido pero sin la cookie de sesión (token robado): 401', async () => {
        const { nonce } = await getNonce(server.baseUrl);

        const res = await postLogin(
            server.baseUrl,
            tokenFor({ ...payload('robado'), nonce }),
        );

        assert.equal(res.status, 401);
        assert.equal(await prisma.user.count(), 0);
    });

    it('login sin haber pedido nonce: 401', async () => {
        const res = await postLogin(
            server.baseUrl,
            tokenFor({ ...payload('sinnonce'), nonce: 'inventado' }),
        );

        assert.equal(res.status, 401);
        assert.equal(await prisma.user.count(), 0);
    });

    it('un rechazo por dominio no consume el nonce: se puede reintentar con otra cuenta', async () => {
        const { nonce, cookie } = await getNonce(server.baseUrl);

        const wrong = await postLogin(
            server.baseUrl,
            tokenFor({
                ...payload('personal', { email: 'a@gmail.com', hd: undefined }),
                nonce,
            }),
            cookie,
        );

        assert.equal(wrong.status, 403);

        const right = await postLogin(
            server.baseUrl,
            tokenFor({ ...payload('trabajo'), nonce }),
            cookie,
        );

        assert.equal(right.status, 200);
        assert.equal(await prisma.user.count(), 1);
    });

    it('el nonce es de un solo uso: repetir el mismo token con la misma cookie falla', async () => {
        const { nonce, cookie } = await getNonce(server.baseUrl);
        const token = tokenFor({ ...payload('uno'), nonce });

        const first = await postLogin(server.baseUrl, token, cookie);

        assert.equal(first.status, 200);
        assert.equal((await me(server.baseUrl, cookieFrom(first))).status, 200);

        const replay = await postLogin(server.baseUrl, token, cookie);

        assert.equal(replay.status, 401);
        assert.equal(await prisma.user.count(), 1);
        assert.equal(
            await prisma.auditLog.count({ where: { action: 'login_success' } }),
            1,
        );
    });

    it('pedir nonce con la sesión iniciada no acorta la vida de esa sesión', async () => {
        const user = await createUser('ail');
        const cookie = await sessionCookieFor(user.id);

        const res = await api(server.baseUrl, 'GET', '/api/auth/nonce', {
            cookie,
        });

        assert.equal(res.status, 200);

        const rows = await prisma.$queryRaw<{ long: boolean }[]>`SELECT ("expire" > now() + interval '7 hours') AS "long" FROM "session" WHERE "sess"->>'userId' = ${user.id}`;

        assert.equal(rows[0]?.long, true);
    });
});
