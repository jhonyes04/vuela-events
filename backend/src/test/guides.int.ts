import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    api,
    closeDb,
    createCustomRole,
    createGuide,
    createUser,
    resetDb,
    sessionCookieFor,
    startServer,
} from './helpers.js';

const ROLE_OWN_ONLY = 'test-guides-own';

describe('guías: permisos propios y de todos', () => {
    let server: Awaited<ReturnType<typeof startServer>>;

    before(async () => {
        server = await startServer();
        await createCustomRole(ROLE_OWN_ONLY, [
            'guides:view',
            'guides:create',
            'guides:edit:own',
            'guides:delete:own',
        ]);
    });

    beforeEach(async () => {
        await resetDb();
    });

    after(async () => {
        await server.close();
        await closeDb();
    });

    const validPayload = () => ({
        name: `Guía ${Date.now()}`,
        url: 'https://example.com/guia',
        active: true,
    });

    const patchGuide = async (userId: string, id: string, body: unknown) =>
        api(server.baseUrl, 'PATCH', `/api/guides/${id}`, {
            cookie: await sessionCookieFor(userId),
            body,
        });

    const deleteGuide = async (userId: string, id: string) =>
        api(server.baseUrl, 'DELETE', `/api/guides/${id}`, {
            cookie: await sessionCookieFor(userId),
        });

    it('ail NO puede editar ni eliminar guías: 403', async () => {
        const ail = await createUser('ail');
        const guide = await createGuide();

        const editRes = await patchGuide(ail.id, guide.id, validPayload());
        const deleteRes = await deleteGuide(ail.id, guide.id);

        assert.equal(editRes.status, 403);
        assert.equal(deleteRes.status, 403);
    });

    it('dt (permiso de todos) edita y elimina una guía creada por otra persona', async () => {
        const creator = await createUser('ail');
        const dt = await createUser('dt');
        const guide = await createGuide({ createdById: creator.id });

        const editRes = await patchGuide(dt.id, guide.id, {
            ...validPayload(),
            name: 'Renombrada por dt',
        });

        assert.equal(editRes.status, 200);
        assert.equal(editRes.body.guide.name, 'Renombrada por dt');

        const deleteRes = await deleteGuide(dt.id, guide.id);
        assert.equal(deleteRes.status, 204);
    });

    it('con solo guides:edit:own, el creador puede editar su propia guía', async () => {
        const owner = await createUser(ROLE_OWN_ONLY);
        const guide = await createGuide({ createdById: owner.id });

        const res = await patchGuide(owner.id, guide.id, {
            ...validPayload(),
            name: 'Editada por su dueño',
        });

        assert.equal(res.status, 200);
        assert.equal(res.body.guide.name, 'Editada por su dueño');
    });

    it('con solo guides:edit:own, NO puede editar una guía ajena: 403', async () => {
        const owner = await createUser(ROLE_OWN_ONLY);
        const other = await createUser('ail');
        const guide = await createGuide({ createdById: other.id });

        const res = await patchGuide(owner.id, guide.id, validPayload());

        assert.equal(res.status, 403);
        assert.equal(
            res.body.error,
            'No puedes gestionar una guía que no creaste',
        );
    });

    it('con solo guides:delete:own, el creador puede eliminar su propia guía', async () => {
        const owner = await createUser(ROLE_OWN_ONLY);
        const guide = await createGuide({ createdById: owner.id });

        const res = await deleteGuide(owner.id, guide.id);

        assert.equal(res.status, 204);
    });

    it('con solo guides:delete:own, NO puede eliminar una ajena: 403', async () => {
        const owner = await createUser(ROLE_OWN_ONLY);
        const other = await createUser('ail');
        const guide = await createGuide({ createdById: other.id });

        const res = await deleteGuide(owner.id, guide.id);

        assert.equal(res.status, 403);
    });

    it('crear una guía guarda al actor como createdById', async () => {
        const owner = await createUser(ROLE_OWN_ONLY);

        const res = await api(server.baseUrl, 'POST', '/api/guides', {
            cookie: await sessionCookieFor(owner.id),
            body: { name: `Guía ${Date.now()}`, url: 'https://example.com/guia' },
        });

        assert.equal(res.status, 201);
        assert.equal(res.body.guide.createdById, owner.id);
    });

    it('GET /guides funciona para quien solo tiene guides:edit:own (sin guides:view)', async () => {
        const ownRole = 'test-guides-own-no-view';
        await createCustomRole(ownRole, ['guides:edit:own']);
        const user = await createUser(ownRole);

        const res = await api(server.baseUrl, 'GET', '/api/guides', {
            cookie: await sessionCookieFor(user.id),
        });

        assert.equal(res.status, 200);
    });
});
