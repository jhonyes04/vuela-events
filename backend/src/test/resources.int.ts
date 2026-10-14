import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    api,
    closeDb,
    createCustomRole,
    createDocument,
    createResourceLink,
    createUser,
    resetDb,
    sessionCookieFor,
    startServer,
} from './helpers.js';

const ROLE_OWN_ONLY = 'test-resources-own';

const PDF_BASE64 = Buffer.from('%PDF-1.4 contenido de prueba').toString(
    'base64',
);

describe('recursos: permisos propios y de todos', () => {
    let server: Awaited<ReturnType<typeof startServer>>;

    before(async () => {
        server = await startServer();
        await createCustomRole(ROLE_OWN_ONLY, [
            'resources:view',
            'resources:create',
            'resources:edit:own',
            'resources:delete:own',
        ]);
    });

    beforeEach(async () => {
        await resetDb();
    });

    after(async () => {
        await server.close();
        await closeDb();
    });

    describe('documentos', () => {
        const patchDocument = async (
            userId: string,
            id: string,
            body: unknown,
        ) =>
            api(server.baseUrl, 'PATCH', `/api/documents/${id}`, {
                cookie: await sessionCookieFor(userId),
                body,
            });

        const deleteDocument = async (userId: string, id: string) =>
            api(server.baseUrl, 'DELETE', `/api/documents/${id}`, {
                cookie: await sessionCookieFor(userId),
            });

        it('ail NO puede editar ni eliminar documentos: 403', async () => {
            const ail = await createUser('ail');
            const doc = await createDocument();

            const editRes = await patchDocument(ail.id, doc.id, {
                title: 'Nuevo título',
                active: true,
            });
            const deleteRes = await deleteDocument(ail.id, doc.id);

            assert.equal(editRes.status, 403);
            assert.equal(deleteRes.status, 403);
        });

        it('dt (permiso de todos) edita y elimina un documento creado por otra persona', async () => {
            const creator = await createUser('ail');
            const dt = await createUser('dt');
            const doc = await createDocument({ createdById: creator.id });

            const editRes = await patchDocument(dt.id, doc.id, {
                title: 'Renombrado por dt',
                active: true,
            });

            assert.equal(editRes.status, 200);
            assert.equal(editRes.body.document.title, 'Renombrado por dt');

            const deleteRes = await deleteDocument(dt.id, doc.id);
            assert.equal(deleteRes.status, 204);
        });

        it('con solo resources:edit:own, el creador puede editar su propio documento', async () => {
            const owner = await createUser(ROLE_OWN_ONLY);
            const doc = await createDocument({ createdById: owner.id });

            const res = await patchDocument(owner.id, doc.id, {
                title: 'Editado por su dueño',
                active: true,
            });

            assert.equal(res.status, 200);
            assert.equal(res.body.document.title, 'Editado por su dueño');
        });

        it('con solo resources:edit:own, NO puede editar un documento ajeno: 403', async () => {
            const owner = await createUser(ROLE_OWN_ONLY);
            const other = await createUser('ail');
            const doc = await createDocument({ createdById: other.id });

            const res = await patchDocument(owner.id, doc.id, {
                title: 'Intento ajeno',
                active: true,
            });

            assert.equal(res.status, 403);
            assert.equal(
                res.body.error,
                'No puedes gestionar un documento que no creaste',
            );
        });

        it('con solo resources:delete:own, el creador puede eliminar su propio documento', async () => {
            const owner = await createUser(ROLE_OWN_ONLY);
            const doc = await createDocument({ createdById: owner.id });

            const res = await deleteDocument(owner.id, doc.id);

            assert.equal(res.status, 204);
        });

        it('con solo resources:delete:own, NO puede eliminar uno ajeno: 403', async () => {
            const owner = await createUser(ROLE_OWN_ONLY);
            const other = await createUser('ail');
            const doc = await createDocument({ createdById: other.id });

            const res = await deleteDocument(owner.id, doc.id);

            assert.equal(res.status, 403);
        });

        it('crear un documento guarda al actor como createdById', async () => {
            const owner = await createUser(ROLE_OWN_ONLY);

            const res = await api(server.baseUrl, 'POST', '/api/documents', {
                cookie: await sessionCookieFor(owner.id),
                body: {
                    title: `Documento ${Date.now()}`,
                    fileName: 'prueba.pdf',
                    contentType: 'application/pdf',
                    dataBase64: PDF_BASE64,
                },
            });

            assert.equal(res.status, 201);
            assert.equal(res.body.document.createdById, owner.id);
        });
    });

    describe('enlaces de recursos', () => {
        const patchLink = async (userId: string, id: string, body: unknown) =>
            api(server.baseUrl, 'PATCH', `/api/resource-links/${id}`, {
                cookie: await sessionCookieFor(userId),
                body,
            });

        const deleteLink = async (userId: string, id: string) =>
            api(server.baseUrl, 'DELETE', `/api/resource-links/${id}`, {
                cookie: await sessionCookieFor(userId),
            });

        it('ail NO puede editar ni eliminar enlaces: 403', async () => {
            const ail = await createUser('ail');
            const link = await createResourceLink();

            const editRes = await patchLink(ail.id, link.id, {
                title: link.title,
                url: link.url,
                active: true,
            });
            const deleteRes = await deleteLink(ail.id, link.id);

            assert.equal(editRes.status, 403);
            assert.equal(deleteRes.status, 403);
        });

        it('dt (permiso de todos) edita y elimina un enlace creado por otra persona', async () => {
            const creator = await createUser('ail');
            const dt = await createUser('dt');
            const link = await createResourceLink({ createdById: creator.id });

            const editRes = await patchLink(dt.id, link.id, {
                title: 'Renombrado por dt',
                url: link.url,
                active: true,
            });

            assert.equal(editRes.status, 200);
            assert.equal(editRes.body.link.title, 'Renombrado por dt');

            const deleteRes = await deleteLink(dt.id, link.id);
            assert.equal(deleteRes.status, 204);
        });

        it('con solo resources:edit:own, el creador puede editar su propio enlace', async () => {
            const owner = await createUser(ROLE_OWN_ONLY);
            const link = await createResourceLink({ createdById: owner.id });

            const res = await patchLink(owner.id, link.id, {
                title: 'Editado por su dueño',
                url: link.url,
                active: true,
            });

            assert.equal(res.status, 200);
            assert.equal(res.body.link.title, 'Editado por su dueño');
        });

        it('con solo resources:edit:own, NO puede editar un enlace ajeno: 403', async () => {
            const owner = await createUser(ROLE_OWN_ONLY);
            const other = await createUser('ail');
            const link = await createResourceLink({ createdById: other.id });

            const res = await patchLink(owner.id, link.id, {
                title: 'Intento ajeno',
                url: link.url,
                active: true,
            });

            assert.equal(res.status, 403);
            assert.equal(
                res.body.error,
                'No puedes gestionar un enlace que no creaste',
            );
        });

        it('con solo resources:delete:own, el creador puede eliminar su propio enlace', async () => {
            const owner = await createUser(ROLE_OWN_ONLY);
            const link = await createResourceLink({ createdById: owner.id });

            const res = await deleteLink(owner.id, link.id);

            assert.equal(res.status, 204);
        });

        it('con solo resources:delete:own, NO puede eliminar uno ajeno: 403', async () => {
            const owner = await createUser(ROLE_OWN_ONLY);
            const other = await createUser('ail');
            const link = await createResourceLink({ createdById: other.id });

            const res = await deleteLink(owner.id, link.id);

            assert.equal(res.status, 403);
        });

        it('crear un enlace guarda al actor como createdById', async () => {
            const owner = await createUser(ROLE_OWN_ONLY);

            const res = await api(
                server.baseUrl,
                'POST',
                '/api/resource-links',
                {
                    cookie: await sessionCookieFor(owner.id),
                    body: {
                        title: `Enlace ${Date.now()}`,
                        url: 'https://example.com/enlace',
                    },
                },
            );

            assert.equal(res.status, 201);
            assert.equal(res.body.link.createdById, owner.id);
        });
    });
});
