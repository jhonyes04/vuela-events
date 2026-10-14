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
});
