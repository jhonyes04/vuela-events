import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    api,
    closeDb,
    createCustomRole,
    createGuide,
    createProject,
    createUser,
    resetDb,
    sessionCookieFor,
    startServer,
} from './helpers.js';

const ROLE_OWN_ONLY = 'test-projects-own';

describe('proyectos: permisos propios y de todos.', () => {
    let server: Awaited<ReturnType<typeof startServer>>;

    before(async () => {
        server = await startServer();
        await createCustomRole(ROLE_OWN_ONLY, [
            'projects:view',
            'projects:create',
            'projects:edit:own',
            'projects:delete:own',
        ]);
    });

    beforeEach(async () => {
        await resetDb();
    });

    after(async () => {
        await server.close();
        await closeDb();
    });

    const validPayload = async () => ({
        name: `Proyecto ${Date.now()}`,
        openingInstructions: null,
        closingInstructions: null,
        color: 'amber' as const,
        guideIds: [(await createGuide()).id],
    });

    const patchProject = async (userId: string, id: string, body: unknown) =>
        api(server.baseUrl, 'PATCH', `/api/projects/${id}`, {
            cookie: await sessionCookieFor(userId),
            body,
        });

    const deleteProject = async (userId: string, id: string) =>
        api(server.baseUrl, 'DELETE', `/api/projects/${id}`, {
            cookie: await sessionCookieFor(userId),
        });

    it('ail NO puede editar ni eliminar proyectos: 403', async () => {
        const ail = await createUser('ail');
        const project = await createProject();

        const editRes = await patchProject(ail.id, project.id, {
            ...(await validPayload()),
            active: true,
        });

        const deleteRes = await deleteProject(ail.id, project.id);

        assert.equal(editRes.status, 403);
        assert.equal(deleteRes.status, 403);
    });

    it('dt (permiso de todos) editar y eliminar un proyecto creado por otra persona', async () => {
        const creator = await createUser('ail');
        const dt = await createUser('dt');
        const project = await createProject({ createdById: creator.id });

        const editRes = await patchProject(dt.id, project.id, {
            ...(await validPayload()),
            name: 'Renombrado por dt',
            active: true,
        });

        assert.equal(editRes.status, 200);
        assert.equal(editRes.body.project.name, 'Renombrado por dt');

        const deleteRes = await deleteProject(dt.id, project.id);
        assert.equal(deleteRes.status, 204);
    });

    it('con solo projects:edit:own, el creador puede editar su propio proyecto', async () => {
        const owner = await createUser(ROLE_OWN_ONLY);
        const project = await createProject({ createdById: owner.id });

        const res = await patchProject(owner.id, project.id, {
            ...(await validPayload()),
            name: 'Editado por su dueño',
            active: true,
        });

        assert.equal(res.status, 200);
        assert.equal(res.body.project.name, 'Editado por su dueño');
    });

    it('con solo projects:edit:own, NO puede editar un proyecto ajeno: 403', async () => {
        const owner = await createUser(ROLE_OWN_ONLY);
        const other = await createUser('ail');
        const project = await createProject({ createdById: other.id });

        const res = await patchProject(owner.id, project.id, {
            ...(await validPayload()),
            active: true,
        });

        assert.equal(res.status, 403);
        assert.equal(
            res.body.error,
            'No puedes gestionar un proyecto que no creaste',
        );
    });

    it('con solo projects:delete:own, el creador puede eliminar su propio proyecto', async () => {
        const owner = await createUser(ROLE_OWN_ONLY);
        const project = await createProject({ createdById: owner.id });

        const res = await deleteProject(owner.id, project.id);

        assert.equal(res.status, 204);
    });

    it('con solo projects:delete:own, NO puede eliminar uno ajeno: 403', async () => {
        const owner = await createUser(ROLE_OWN_ONLY);
        const other = await createUser('ail');
        const project = await createProject({ createdById: other.id });

        const res = await deleteProject(owner.id, project.id);

        assert.equal(res.status, 403);
    });

    it('crear un proyecto guarda al actor como createdById', async () => {
        const owner = await createUser(ROLE_OWN_ONLY);
        const payload = await validPayload();

        const res = await api(server.baseUrl, 'POST', '/api/projects', {
            cookie: await sessionCookieFor(owner.id),
            body: payload,
        });

        assert.equal(res.status, 201);
        assert.equal(res.body.project.createdById, owner.id);
    });

    it('GET /projects funciona para quien solo tiene projects:edit:own (sin projects:view)', async () => {
        const ownRole = 'test-projects-own-no-view';
        await createCustomRole(ownRole, ['projects:edit:own']);
        const user = await createUser(ownRole);

        const res = await api(server.baseUrl, 'GET', '/api/projects', {
            cookie: await sessionCookieFor(user.id),
        });

        assert.equal(res.status, 200);
    });

    it('GET /projects/eligible-users: todos los roles menos dt y admin', async () => {
        const dt = await createUser('dt');
        const ail = await createUser('ail');
        const admin = await createUser('admin');
        const custom = await createUser(ROLE_OWN_ONLY);

        const res = await api(
            server.baseUrl,
            'GET',
            '/api/projects/eligible-users',
            { cookie: await sessionCookieFor(dt.id) },
        );

        assert.equal(res.status, 200);
        const ids = res.body.users.map((u: { id: string }) => u.id);
        assert.ok(ids.includes(ail.id));
        assert.ok(ids.includes(custom.id));
        assert.ok(!ids.includes(dt.id));
        assert.ok(!ids.includes(admin.id));
    });

    describe('propietario', () => {
        const postProject = async (userId: string, body: unknown) =>
            api(server.baseUrl, 'POST', '/api/projects', {
                cookie: await sessionCookieFor(userId),
                body,
            });

        it('dt crea un proyecto y puede fijar el propietario a un ail', async () => {
            const dt = await createUser('dt');
            const ail = await createUser('ail');

            const res = await postProject(dt.id, {
                ...(await validPayload()),
                ownerId: ail.id,
            });

            assert.equal(res.status, 201);
            assert.equal(res.body.project.createdById, ail.id);
        });

        it('dt NO puede fijar el propietario a un admin: 400', async () => {
            const dt = await createUser('dt');
            const admin = await createUser('admin');

            const res = await postProject(dt.id, {
                ...(await validPayload()),
                ownerId: admin.id,
            });

            assert.equal(res.status, 400);
            assert.equal(res.body.error, 'Propietario no válido');
        });

        it('si el propietario actual es admin, dt no puede reasignarlo ni a sí mismo: 400', async () => {
            const dt = await createUser('dt');
            const admin = await createUser('admin');
            const project = await createProject({ createdById: admin.id });

            const res = await patchProject(dt.id, project.id, {
                ...(await validPayload()),
                active: true,
                ownerId: dt.id,
            });

            assert.equal(res.status, 400);
            assert.equal(res.body.error, 'Propietario no válido');
        });
    });
});
