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

const validSeries = {
    title: 'Taller semanal',
    location: 'Sala de pruebas',
    from: '2027-01-01',
    to: '2027-12-31',
    weekdays: [3],
    startTime: '09:00',
    endTime: '13:00',
};

const weekdayOf = (d: Date) =>
    new Intl.DateTimeFormat('en-US', {
        timeZone: 'Europe/Madrid',
        weekday: 'short',
    }).format(d);

describe('series recurrentes y eliminación de sesiones', () => {
    let server: Awaited<ReturnType<typeof startServer>>;

    before(async () => {
        server = await startServer();
    });

    beforeEach(resetDb);

    after(async () => {
        await server.close();
        await closeDb();
    });

    const postSeries = async (userId: string, body: unknown) =>
        api(server.baseUrl, 'POST', '/api/events/recurring', {
            cookie: await sessionCookieFor(userId),
            body,
        });

    const remove = async (userId: string, eventId: string) =>
        api(server.baseUrl, 'DELETE', `/api/events/${eventId}`, {
            cookie: await sessionCookieFor(userId),
        });

    const makeEvent = (createdById: string) =>
        prisma.event.create({
            data: {
                title: 'Jornada de prueba',
                startsAt: new Date('2030-01-10T10:00:00Z'),
                endsAt: new Date('2030-01-10T12:00:00Z'),
                createdById,
            },
        });

    describe('crear series', () => {
        it('ail NO puede crear series: 403 y no se escribe nada', async () => {
            const ail = await createUser('ail');

            const res = await postSeries(ail.id, validSeries);

            assert.equal(res.status, 403);
            assert.equal(await prisma.event.count(), 0);
        });

        it('sin sesión: 401; sin Origin: 403; en ambos casos no se crea nada', async () => {
            const dt = await createUser('dt');

            const anon = await api(server.baseUrl, 'POST', '/api/events/recurring', {
                body: validSeries,
            });
            const noOrigin = await api(server.baseUrl, 'POST', '/api/events/recurring', {
                cookie: await sessionCookieFor(dt.id),
                body: validSeries,
                origin: null,
            });

            assert.equal(anon.status, 401);
            assert.equal(noOrigin.status, 403);
            assert.equal(await prisma.event.count(), 0);
        });

        it('dt crea todos los miércoles de 2027: 52 sesiones, misma serie, horas de Madrid', async () => {
            const dt = await createUser('dt');

            const res = await postSeries(dt.id, validSeries);

            assert.equal(res.status, 201);
            assert.equal(res.body.count, 52);

            const events = await prisma.event.findMany({
                where: { seriesId: res.body.seriesId },
                orderBy: { startsAt: 'asc' },
            });

            assert.equal(events.length, 52);
            assert.equal(await prisma.event.count(), 52);
            assert.ok(events.every((e) => e.createdById === dt.id));
            assert.ok(events.every((e) => weekdayOf(e.startsAt) === 'Wed'));
            assert.ok(events.every((e) => e.location === 'Sala de pruebas'));
            // Enero es UTC+1 y julio es UTC+2: la hora local es siempre 09:00.
            assert.equal(events[0]?.startsAt.toISOString(), '2027-01-06T08:00:00.000Z');
            assert.equal(events[0]?.endsAt.toISOString(), '2027-01-06T12:00:00.000Z');

            const july = events.find((e) => e.startsAt.getUTCMonth() === 6);

            assert.equal(july?.startsAt.getUTCHours(), 7);
            assert.equal(july?.endsAt.getUTCHours(), 11);
        });

        it('admin puede y se admiten varios días: lunes y miércoles de enero de 2027', async () => {
            const admin = await createUser('admin');

            const res = await postSeries(admin.id, {
                ...validSeries,
                from: '2027-01-01',
                to: '2027-01-31',
                weekdays: [1, 3],
                capacity: 15,
            });

            assert.equal(res.status, 201);
            assert.equal(res.body.count, 8);

            const events = await prisma.event.findMany();

            assert.ok(events.every((e) => e.capacity === 15));
            assert.ok(
                events.every((e) =>
                    ['Mon', 'Wed'].includes(weekdayOf(e.startsAt)),
                ),
            );
        });

        it('deja una entrada de auditoría con el número de sesiones', async () => {
            const dt = await createUser('dt');

            await postSeries(dt.id, validSeries);

            const log = await prisma.auditLog.findFirstOrThrow({
                where: { action: 'event_series_created' },
            });

            assert.equal(log.actorId, dt.id);
            assert.equal(log.newValue, '52 sesiones');
        });

        it('las sesiones aparecen en el listado con su seriesId', async () => {
            const dt = await createUser('dt');
            const created = await postSeries(dt.id, {
                ...validSeries,
                to: '2027-01-31',
            });

            const list = await api(
                server.baseUrl,
                'GET',
                '/api/events?from=2027-01-01T00:00:00.000Z&to=2027-02-01T00:00:00.000Z',
                { cookie: await sessionCookieFor(dt.id) },
            );

            assert.equal(list.status, 200);
            assert.equal(list.body.events.length, created.body.count);
            assert.ok(
                list.body.events.every(
                    (e: { seriesId: string }) => e.seriesId === created.body.seriesId,
                ),
            );
        });

        it('peticiones no válidas: 400 y no se crea ninguna sesión', async () => {
            const dt = await createUser('dt');
            const other = await createUser('admin');
            const { location: _unused, ...withoutLocation } = validSeries;

            void _unused;

            const cases: [string, object][] = [
                ['cada día del año supera el máximo', { ...validSeries, weekdays: [1, 2, 3, 4, 5, 6, 7] }],
                ['rango invertido', { ...validSeries, from: '2027-02-01', to: '2027-01-01' }],
                ['fecha inexistente', { ...validSeries, to: '2027-02-30' }],
                ['fin igual al inicio', { ...validSeries, startTime: '13:00', endTime: '13:00' }],
                ['fin anterior al inicio', { ...validSeries, startTime: '13:00', endTime: '09:00' }],
                ['hora mal formada', { ...validSeries, startTime: '9:00' }],
                ['ningún día coincide', { ...validSeries, from: '2027-01-07', to: '2027-01-07' }],
                ['sin días de la semana', { ...validSeries, weekdays: [] }],
                ['día de la semana 8', { ...validSeries, weekdays: [8] }],
                ['días repetidos', { ...validSeries, weekdays: [3, 3] }],
                ['rango de décadas', { ...validSeries, to: '2099-12-31' }],
                ['sin lugar', withoutLocation],
                ['createdById en el cuerpo', { ...validSeries, createdById: other.id }],
                ['aforo negativo', { ...validSeries, capacity: -1 }],
            ];

            for (const [name, body] of cases) {
                const res = await postSeries(dt.id, body);

                assert.equal(res.status, 400, name);
            }

            assert.equal(await prisma.event.count(), 0);
        });

        it('el mensaje del límite indica el máximo de sesiones', async () => {
            const dt = await createUser('dt');

            const res = await postSeries(dt.id, {
                ...validSeries,
                weekdays: [1, 2, 3, 4, 5, 6, 7],
            });

            assert.equal(res.status, 400);
            assert.match(res.body.error, /200 sesiones/);
        });
    });

    describe('eliminar una sesión', () => {
        it('admin elimina una sesión de otra persona; el resto de la serie permanece', async () => {
            const dt = await createUser('dt');
            const admin = await createUser('admin');
            const created = await postSeries(dt.id, validSeries);
            const first = await prisma.event.findFirstOrThrow({
                where: { seriesId: created.body.seriesId },
                orderBy: { startsAt: 'asc' },
            });

            const res = await remove(admin.id, first.id);

            assert.equal(res.status, 204);
            assert.equal(await prisma.event.count(), 51);
            assert.equal(
                await prisma.event.count({ where: { id: first.id } }),
                0,
            );
        });

        it('dt elimina una sesión creada por él mismo', async () => {
            const dt = await createUser('dt');
            const event = await makeEvent(dt.id);

            const res = await remove(dt.id, event.id);

            assert.equal(res.status, 204);
            assert.equal(await prisma.event.count(), 0);
        });

        it('otro dt NO puede eliminar la sesión de un compañero: 403 y sigue existiendo', async () => {
            const owner = await createUser('dt');
            const other = await createUser('dt');
            const event = await makeEvent(owner.id);

            const res = await remove(other.id, event.id);

            assert.equal(res.status, 403);
            assert.equal(await prisma.event.count(), 1);
        });

        it('ail NO puede eliminar: 403 y sigue existiendo', async () => {
            const owner = await createUser('dt');
            const ail = await createUser('ail');
            const event = await makeEvent(owner.id);

            const res = await remove(ail.id, event.id);

            assert.equal(res.status, 403);
            assert.equal(await prisma.event.count(), 1);
        });

        it('inexistente: 404; id mal formado: 400; sin sesión: 401; sin Origin: 403', async () => {
            const admin = await createUser('admin');
            const event = await makeEvent(admin.id);

            assert.equal(
                (await remove(admin.id, '11111111-1111-4111-8111-111111111111')).status,
                404,
            );
            assert.equal((await remove(admin.id, 'no-es-uuid')).status, 400);
            assert.equal(
                (await api(server.baseUrl, 'DELETE', `/api/events/${event.id}`)).status,
                401,
            );
            assert.equal(
                (
                    await api(server.baseUrl, 'DELETE', `/api/events/${event.id}`, {
                        cookie: await sessionCookieFor(admin.id),
                        origin: null,
                    })
                ).status,
                403,
            );
            assert.equal(await prisma.event.count(), 1);
        });

        it('borra las inscripciones en cascada y deja auditoría con título, fecha y nº de inscripciones', async () => {
            const admin = await createUser('admin');
            const a = await createUser('ail');
            const b = await createUser('ail');
            const event = await makeEvent(admin.id);

            await prisma.registration.createMany({
                data: [
                    { eventId: event.id, userId: a.id },
                    { eventId: event.id, userId: b.id },
                ],
            });

            const res = await remove(admin.id, event.id);

            assert.equal(res.status, 204);
            assert.equal(await prisma.registration.count(), 0);

            const log = await prisma.auditLog.findFirstOrThrow({
                where: { action: 'event_deleted' },
            });

            assert.equal(log.actorId, admin.id);
            assert.equal(log.oldValue, '2030-01-10 Jornada de prueba');
            assert.equal(log.newValue, '2 inscripciones');
        });
    });
});
