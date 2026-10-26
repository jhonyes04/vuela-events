import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    api,
    closeDb,
    createCustomRole,
    createMaterial,
    createUser,
    resetDb,
    sessionCookieFor,
    startServer,
} from './helpers.js';

const ROLE_OWN_ONLY = 'test-materials-own';

describe('materiales: permisos propios y de todos', () => {
    let server: Awaited<ReturnType<typeof startServer>>;

    before(async () => {
        server = await startServer();
        await createCustomRole(ROLE_OWN_ONLY, [
            'materials:view',
            'materials:create',
            'materials:edit:own',
            'materials:delete:own',
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
        name: `Material ${Date.now()}`,
        observations: undefined,
        active: true,
    });

    // createMaterialSchema no acepta "active" (solo updateMaterialSchema).
    const createPayload = () => ({
        name: `Material ${Date.now()}-${Math.random()}`,
        observations: undefined,
    });

    const postMaterial = async (userId: string, body: unknown) =>
        api(server.baseUrl, 'POST', '/api/materials', {
            cookie: await sessionCookieFor(userId),
            body,
        });

    const patchMaterial = async (
        userId: string,
        id: string,
        body: unknown,
    ) =>
        api(server.baseUrl, 'PATCH', `/api/materials/${id}`, {
            cookie: await sessionCookieFor(userId),
            body,
        });

    const deleteMaterial = async (userId: string, id: string) =>
        api(server.baseUrl, 'DELETE', `/api/materials/${id}`, {
            cookie: await sessionCookieFor(userId),
        });

    it('ail NO puede editar ni eliminar materiales ajenos: 403', async () => {
        const ail = await createUser('ail');
        const other = await createUser('ail');
        const material = await createMaterial({ createdById: other.id });

        const editRes = await patchMaterial(
            ail.id,
            material.id,
            validPayload(),
        );
        const deleteRes = await deleteMaterial(ail.id, material.id);

        assert.equal(editRes.status, 403);
        assert.equal(deleteRes.status, 403);
    });

    it('dt (permiso de todos) edita y elimina un material creado por otra persona', async () => {
        const creator = await createUser('ail');
        const dt = await createUser('dt');
        const material = await createMaterial({ createdById: creator.id });

        const editRes = await patchMaterial(dt.id, material.id, {
            ...validPayload(),
            name: 'Renombrado por dt',
        });

        assert.equal(editRes.status, 200);
        assert.equal(editRes.body.material.name, 'Renombrado por dt');

        const deleteRes = await deleteMaterial(dt.id, material.id);
        assert.equal(deleteRes.status, 204);
    });

    it('con solo materials:edit:own, el creador puede editar su propio material', async () => {
        const owner = await createUser(ROLE_OWN_ONLY);
        const material = await createMaterial({ createdById: owner.id });

        const res = await patchMaterial(owner.id, material.id, {
            ...validPayload(),
            name: 'Editado por su dueño',
        });

        assert.equal(res.status, 200);
        assert.equal(res.body.material.name, 'Editado por su dueño');
    });

    it('con solo materials:edit:own, NO puede editar uno ajeno: 403', async () => {
        const owner = await createUser(ROLE_OWN_ONLY);
        const other = await createUser('ail');
        const material = await createMaterial({ createdById: other.id });

        const res = await patchMaterial(
            owner.id,
            material.id,
            validPayload(),
        );

        assert.equal(res.status, 403);
        assert.equal(
            res.body.error,
            'No puedes gestionar un material que no creaste',
        );
    });

    it('con solo materials:delete:own, el creador puede eliminar su propio material', async () => {
        const owner = await createUser(ROLE_OWN_ONLY);
        const material = await createMaterial({ createdById: owner.id });

        const res = await deleteMaterial(owner.id, material.id);

        assert.equal(res.status, 204);
    });

    it('con solo materials:delete:own, NO puede eliminar uno ajeno: 403', async () => {
        const owner = await createUser(ROLE_OWN_ONLY);
        const other = await createUser('ail');
        const material = await createMaterial({ createdById: other.id });

        const res = await deleteMaterial(owner.id, material.id);

        assert.equal(res.status, 403);
    });

    it('crear un material guarda al actor como createdById', async () => {
        const owner = await createUser(ROLE_OWN_ONLY);

        const res = await postMaterial(owner.id, createPayload());

        assert.equal(res.status, 201);
        assert.equal(res.body.material.createdById, owner.id);
    });

    it('GET /materials funciona para quien solo tiene materials:edit:own (sin materials:view)', async () => {
        const ownRole = 'test-materials-own-no-view';
        await createCustomRole(ownRole, ['materials:edit:own']);
        const user = await createUser(ownRole);

        const res = await api(server.baseUrl, 'GET', '/api/materials', {
            cookie: await sessionCookieFor(user.id),
        });

        assert.equal(res.status, 200);
    });

    describe('propietario', () => {
        it('admin crea un material y puede fijar el propietario a cualquiera (admin incluido)', async () => {
            const admin = await createUser('admin');
            const otherAdmin = await createUser('admin');

            const res = await postMaterial(admin.id, {
                ...createPayload(),
                ownerId: otherAdmin.id,
            });

            assert.equal(res.status, 201);
            assert.equal(res.body.material.createdById, otherAdmin.id);
        });

        it('dt crea un material y puede fijar el propietario a un ail', async () => {
            const dt = await createUser('dt');
            const ail = await createUser('ail');

            const res = await postMaterial(dt.id, {
                ...createPayload(),
                ownerId: ail.id,
            });

            assert.equal(res.status, 201);
            assert.equal(res.body.material.createdById, ail.id);
        });

        it('dt NO puede fijar el propietario a un admin: 400', async () => {
            const dt = await createUser('dt');
            const admin = await createUser('admin');

            const res = await postMaterial(dt.id, {
                ...createPayload(),
                ownerId: admin.id,
            });

            assert.equal(res.status, 400);
            assert.equal(res.body.error, 'Propietario no válido');
        });

        it('ail (sin ownership:manage) manda ownerId pero se ignora: queda como actor', async () => {
            const ail = await createUser('ail');
            const other = await createUser('ail');

            const res = await postMaterial(ail.id, {
                ...createPayload(),
                ownerId: other.id,
            });

            assert.equal(res.status, 201);
            assert.equal(res.body.material.createdById, ail.id);
        });

        it('admin reasigna el propietario de un material ajeno al editar', async () => {
            const admin = await createUser('admin');
            const creator = await createUser('ail');
            const newOwner = await createUser('ail');
            const material = await createMaterial({
                createdById: creator.id,
            });

            const res = await patchMaterial(admin.id, material.id, {
                ...validPayload(),
                ownerId: newOwner.id,
            });

            assert.equal(res.status, 200);
            assert.equal(res.body.material.createdById, newOwner.id);
        });

        it('dt reasigna el propietario de un material de otro ail a un tercero', async () => {
            const dt = await createUser('dt');
            const creator = await createUser('ail');
            const newOwner = await createUser('ail');
            const material = await createMaterial({
                createdById: creator.id,
            });

            const res = await patchMaterial(dt.id, material.id, {
                ...validPayload(),
                ownerId: newOwner.id,
            });

            assert.equal(res.status, 200);
            assert.equal(res.body.material.createdById, newOwner.id);
        });

        it('si el propietario actual es admin, dt NO puede reasignarlo a un tercero: 400', async () => {
            const dt = await createUser('dt');
            const admin = await createUser('admin');
            const other = await createUser('ail');
            const material = await createMaterial({
                createdById: admin.id,
            });

            const res = await patchMaterial(dt.id, material.id, {
                ...validPayload(),
                ownerId: other.id,
            });

            assert.equal(res.status, 400);
            assert.equal(res.body.error, 'Propietario no válido');
        });

        it('si el propietario actual es admin, dt tampoco puede asignárselo a sí mismo: 400', async () => {
            const dt = await createUser('dt');
            const admin = await createUser('admin');
            const material = await createMaterial({
                createdById: admin.id,
            });

            const res = await patchMaterial(dt.id, material.id, {
                ...validPayload(),
                ownerId: dt.id,
            });

            assert.equal(res.status, 400);
            assert.equal(res.body.error, 'Propietario no válido');
        });

        it('si el propietario actual es admin, otro admin SÍ puede reasignarlo', async () => {
            const admin = await createUser('admin');
            const ownerAdmin = await createUser('admin');
            const newOwner = await createUser('ail');
            const material = await createMaterial({
                createdById: ownerAdmin.id,
            });

            const res = await patchMaterial(admin.id, material.id, {
                ...validPayload(),
                ownerId: newOwner.id,
            });

            assert.equal(res.status, 200);
            assert.equal(res.body.material.createdById, newOwner.id);
        });

        it('editar sin mandar ownerId no toca al propietario actual', async () => {
            const dt = await createUser('dt');
            const creator = await createUser('ail');
            const material = await createMaterial({
                createdById: creator.id,
            });

            const res = await patchMaterial(dt.id, material.id, {
                name: material.name,
                observations: undefined,
                active: true,
            });

            assert.equal(res.status, 200);
            assert.equal(res.body.material.createdById, creator.id);
        });
    });
});
