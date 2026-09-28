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
    D,
    getNonce,
    loginWith,
    me,
    payload,
    postLogin,
    resetTokens,
    tokenFor,
    verifyToken,
} from './fakeGoogle.js';

describe('login por HTTP (ruta real, Google simulado)', () => {
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

    const login = (
        p: ReturnType<typeof payload>,
        extra: object = {},
    ) => loginWith(server.baseUrl, p, extra);

    it('login válido: crea el usuario con rol ail, emite cookie segura y deja auditoría', async () => {
        const res = await login(payload('ana'));

        assert.equal(res.status, 200);
        assert.equal(res.body.user.roleId, 'ail');
        assert.equal(res.body.user.email, `ana@${D}`);

        const raw = res.setCookie.find((c) => c.startsWith('vuela.sid='));

        assert.ok(raw, 'debe emitir la cookie de sesión');
        assert.match(raw, /HttpOnly/i);
        assert.match(raw, /SameSite=Lax/i);

        const check = await me(server.baseUrl, cookieFrom(res));

        assert.equal(check.status, 200);
        assert.equal(check.body.user.id, res.body.user.id);

        const log = await prisma.auditLog.findFirstOrThrow();

        assert.equal(log.action, 'login_success');
        assert.equal(log.actorId, res.body.user.id);
    });

    it('dominio ajeno (gmail.com): 403 con mensaje claro, sin cookie, sin usuario y con auditoría', async () => {
        const res = await login(
            payload('intruso', { email: 'intruso@gmail.com', hd: undefined }),
        );

        assert.equal(res.status, 403);
        assert.equal(res.body.error, `Solo se permiten cuentas @${D}`);
        assert.equal(res.setCookie.length, 0);
        assert.equal(await prisma.user.count(), 0);

        const log = await prisma.auditLog.findFirstOrThrow();

        assert.equal(log.action, 'login_rejected');
        assert.equal(log.newValue, 'domain_not_allowed');
    });

    it('correo del dominio pero sin claim hd (cuenta no administrada): 403', async () => {
        const res = await login(payload('sinhd', { hd: undefined }));

        assert.equal(res.status, 403);
        assert.equal(res.body.error, `Solo se permiten cuentas @${D}`);
        assert.equal(await prisma.user.count(), 0);
    });

    it('correo sin verificar: 403 con su propio mensaje', async () => {
        const res = await login(payload('sinverificar', { email_verified: false }));

        assert.equal(res.status, 403);
        assert.equal(res.body.error, 'Tu correo de Google no está verificado');
        assert.equal(res.setCookie.length, 0);
    });

    it('token que Google no valida: 401 y sin cookie', async () => {
        const { cookie } = await getNonce(server.baseUrl);
        const res = await postLogin(server.baseUrl, 'x'.repeat(30), cookie);

        assert.equal(res.status, 401);
        assert.equal(res.setCookie.length, 0);
    });

    it('cuenta desactivada: 403 con mensaje claro, sin cookie y con auditoría', async () => {
        await prisma.user.create({
            data: {
                email: `baja@${D}`,
                googleSub: 'sub-baja',
                name: 'Baja',
                active: false,
            },
        });

        const res = await login(payload('baja'));

        assert.equal(res.status, 403);
        assert.match(res.body.error, /desactivada/);
        assert.equal(res.setCookie.length, 0);

        const log = await prisma.auditLog.findFirstOrThrow();

        assert.equal(log.newValue, 'account_disabled');
    });

    it('el login descarta la sesión previa (anti fijación de sesión)', async () => {
        const victim = await createUser('ail');
        const oldCookie = await sessionCookieFor(victim.id);
        const { nonce } = await getNonce(server.baseUrl, oldCookie);

        const res = await postLogin(
            server.baseUrl,
            tokenFor({ ...payload('nuevo'), nonce }),
            oldCookie,
        );

        assert.equal(res.status, 200);

        const newCookie = cookieFrom(res);

        assert.notEqual(newCookie, oldCookie);
        assert.equal((await me(server.baseUrl, oldCookie)).status, 401);
        assert.equal((await me(server.baseUrl, newCookie)).status, 200);
    });

    it('campos extra en el cuerpo (p. ej. role) se rechazan con 400', async () => {
        const res = await login(payload('listo'), { role: 'admin' });

        assert.equal(res.status, 400);
        assert.equal(await prisma.user.count(), 0);
    });

    it('sin cabecera Origin: 403 y no se crea ni usuario ni sesión', async () => {
        const { nonce, cookie } = await getNonce(server.baseUrl);
        const res = await postLogin(
            server.baseUrl,
            tokenFor({ ...payload('sinorigin'), nonce }),
            cookie,
            {},
            null,
        );

        assert.equal(res.status, 403);
        assert.equal(res.setCookie.length, 0);
        assert.equal(await prisma.user.count(), 0);
    });

    it('logout: 204, borra la cookie e invalida la sesión en el servidor', async () => {
        const user = await createUser('ail');
        const cookie = await sessionCookieFor(user.id);

        const res = await api(server.baseUrl, 'POST', '/api/auth/logout', {
            cookie,
        });

        assert.equal(res.status, 204);
        assert.match(res.setCookie.join('\n'), /vuela\.sid=;/);
        assert.equal((await me(server.baseUrl, cookie)).status, 401);
    });

    // Debe ir el último: el limitador de login es global al proceso y ya
    // acumula los intentos de los casos anteriores (límite: 10 por 15 min).
    it('limitador: tras 10 intentos de login en la ventana, responde 429', async () => {
        const statuses: number[] = [];

        for (let i = 0; i < 5; i++) {
            statuses.push(
                (await postLogin(server.baseUrl, 'x'.repeat(30))).status,
            );
        }

        assert.equal(statuses.at(-1), 429);
    });
});
