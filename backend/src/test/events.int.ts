import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../lib/prisma.js';
import {
    api,
    closeDb,
    createCategory,
    createUser,
    resetDb,
    sessionCookieFor,
    startServer,
} from './helpers.js';

const validEvent = {
    title: 'Jornada de prueba',
    location: 'Sala de pruebas',
    startsAt: '2030-01-10T10:00:00.000Z',
    endsAt: '2030-01-10T12:00:00.000Z',
};

describe('eventos: permisos y validación', () => {
    let server: Awaited<ReturnType<typeof startServer>>;
    let categoryId: string;

    before(async () => {
        server = await startServer();
    });

    beforeEach(async () => {
        await resetDb();
        categoryId = (await createCategory()).id;
    });

    after(async () => {
        await server.close();
        await closeDb();
    });

    // categoryId se añade solo si no viene ya en el cuerpo.
    const post = async (userId: string, body: unknown) =>
        api(server.baseUrl, 'POST', '/api/events', {
            cookie: await sessionCookieFor(userId),
            body:
                typeof body === 'object' && body !== null
                    ? { categoryId, ...body }
                    : body,
        });

    it('ail NO puede crear eventos: 403 y no se escribe nada', async () => {
        const ail = await createUser('ail');

        const res = await post(ail.id, validEvent);

        assert.equal(res.status, 403);
        assert.equal(await prisma.event.count(), 0);
    });

    it('dt puede crear eventos y queda registrado como creador', async () => {
        const dt = await createUser('dt');

        const res = await post(dt.id, validEvent);

        assert.equal(res.status, 201);
        assert.equal(res.body.event.createdBy.id, dt.id);
        assert.equal(await prisma.event.count(), 1);
    });

    it('el evento expone el nombre y el Punto Vuela del organizador, y nada más de él', async () => {
        const dt = await createUser('dt');

        const res = await post(dt.id, validEvent);

        assert.deepEqual(res.body.event.createdBy, {
            id: dt.id,
            name: dt.name,
            puntoVuela: dt.puntoVuela,
        });
    });

    it('admin puede crear eventos', async () => {
        const admin = await createUser('admin');

        const res = await post(admin.id, validEvent);

        assert.equal(res.status, 201);
        assert.equal(await prisma.event.count(), 1);
    });

    it('sin sesión: 401', async () => {
        const res = await api(server.baseUrl, 'POST', '/api/events', {
            body: validEvent,
        });

        assert.equal(res.status, 401);
        assert.equal(await prisma.event.count(), 0);
    });

    it('sin cabecera Origin: 403 aunque sea admin (CSRF)', async () => {
        const admin = await createUser('admin');

        const res = await api(server.baseUrl, 'POST', '/api/events', {
            cookie: await sessionCookieFor(admin.id),
            body: validEvent,
            origin: null,
        });

        assert.equal(res.status, 403);
        assert.equal(await prisma.event.count(), 0);
    });

    it('createdById en el body se rechaza: no se puede suplantar al creador', async () => {
        const dt = await createUser('dt');
        const other = await createUser('admin');

        const res = await post(dt.id, { ...validEvent, createdById: other.id });

        assert.equal(res.status, 400);
        assert.equal(await prisma.event.count(), 0);
    });

    it('fecha de fin anterior al inicio: 400', async () => {
        const dt = await createUser('dt');

        const res = await post(dt.id, {
            ...validEvent,
            endsAt: '2030-01-10T09:00:00.000Z',
        });

        assert.equal(res.status, 400);
    });

    it('aforo cero o negativo: 400', async () => {
        const dt = await createUser('dt');

        assert.equal(
            (await post(dt.id, { ...validEvent, capacity: 0 })).status,
            400,
        );
        assert.equal(
            (await post(dt.id, { ...validEvent, capacity: -5 })).status,
            400,
        );
    });

    it('cualquier rol autenticado puede listar eventos', async () => {
        const admin = await createUser('admin');
        await prisma.event.create({
            data: {
                title: 'Existente',
                startsAt: new Date('2030-02-01T10:00:00Z'),
                endsAt: new Date('2030-02-01T11:00:00Z'),
                createdById: admin.id,
                categoryId,
            },
        });

        for (const role of ['ail', 'dt', 'admin'] as const) {
            const user = await createUser(role);
            const res = await api(server.baseUrl, 'GET', '/api/events', {
                cookie: await sessionCookieFor(user.id),
            });

            assert.equal(res.status, 200, `rol ${role}`);
            assert.equal(res.body.events.length, 1, `rol ${role}`);
        }
    });

    it('usuario desactivado con sesión previa pierde el acceso: 401', async () => {
        const dt = await createUser('dt');
        const cookie = await sessionCookieFor(dt.id);

        await prisma.user.update({
            where: { id: dt.id },
            data: { active: false },
        });

        const res = await api(server.baseUrl, 'POST', '/api/events', {
            cookie,
            body: validEvent,
        });

        assert.equal(res.status, 401);
        assert.equal(await prisma.event.count(), 0);
    });

    it('el lugar es obligatorio: sin él, 400 y no se crea nada', async () => {
        const dt = await createUser('dt');

        // undefined desaparece al serializar a JSON: equivale a omitir el campo.
        const res = await post(dt.id, { ...validEvent, location: undefined });

        assert.equal(res.status, 400);
        assert.equal(await prisma.event.count(), 0);
    });

    it('guarda y devuelve el subtítulo', async () => {
        const dt = await createUser('dt');

        const res = await post(dt.id, {
            ...validEvent,
            subtitle: 'Taller de robótica',
        });

        assert.equal(res.status, 201);
        assert.equal(res.body.event.subtitle, 'Taller de robótica');
    });
});
