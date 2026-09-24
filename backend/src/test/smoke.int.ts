import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    api,
    closeDb,
    createUser,
    resetDb,
    sessionCookieFor,
    startServer,
} from './helpers.js';

describe('infraestructura de tests', () => {
    let server: Awaited<ReturnType<typeof startServer>>;

    before(async () => {
        server = await startServer();
    });

    beforeEach(resetDb);

    after(async () => {
        await server.close();
        await closeDb();
    });

    it('con "sessión" simulada, /api/auth/me devuelve el usuario y su rol', async () => {
        const user = await createUser('dt');
        const cookie = await sessionCookieFor(user.id);

        const res = await api(server.baseUrl, 'GET', '/api/auth/me', {
            cookie,
        });

        assert.equal(res.status, 200);
        assert.equal(res.body.user.id, user.id);
        assert.equal(res.body.user.role, 'dt');
    });

    it('sin cookie, /api/auth/me da 401', async () => {
        const res = await api(server.baseUrl, 'GET', '/api/auth/me');

        assert.equal(res.status, 401);
    });

    it('cookie con firma alterada da 401', async () => {
        const user = await createUser('admin');
        const cookie = await sessionCookieFor(user.id);
        const forged = cookie.slice(0, -4) + 'AAAA';

        const res = await api(server.baseUrl, 'GET', '/api/auth/me', {
            cookie: forged,
        });

        assert.equal(res.status, 401);
    });
});
