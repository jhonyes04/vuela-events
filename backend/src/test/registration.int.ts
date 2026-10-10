import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../lib/prisma.js';
import { Prisma } from '../generated/prisma/client.js';
import {
    api,
    closeDb,
    createProject,
    createGuide,
    createUser,
    resetDb,
    sessionCookieFor,
    startServer,
} from './helpers.js';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const makeEvent = async (
    createdById: string,
    opts: { capacity?: number; past?: boolean } = {},
) => {
    const start = opts.past ? Date.now() - 2 * DAY : Date.now() + DAY;
    const project = await createProject();
    const guide = await createGuide();

    return prisma.event.create({
        data: {
            title: 'Evento de prueba',
            startsAt: new Date(start),
            endsAt: new Date(start + HOUR),
            capacity: opts.capacity,
            createdById,
            projectId: project.id,
            guideId: guide.id,
        },
    });
};

describe('inscripciones a eventos', () => {
    let server: Awaited<ReturnType<typeof startServer>>;

    before(async () => {
        server = await startServer();
    });

    beforeEach(resetDb);

    after(async () => {
        await server.close();
        await closeDb();
    });

    const register = async (userId: string, eventId: string) =>
        api(server.baseUrl, 'POST', `/api/events/${eventId}/registrations`, {
            cookie: await sessionCookieFor(userId),
        });

    const unregister = async (userId: string, eventId: string) =>
        api(server.baseUrl, 'DELETE', `/api/events/${eventId}/registrations`, {
            cookie: await sessionCookieFor(userId),
        });

    const listFor = async (userId: string) =>
        api(server.baseUrl, 'GET', '/api/events', {
            cookie: await sessionCookieFor(userId),
        });

    const setup = async (opts: { capacity?: number; past?: boolean } = {}) => {
        const admin = await createUser('admin');
        const event = await makeEvent(admin.id, opts);

        return { admin, event };
    };

    it('un usuario se inscribe una vez: 201', async () => {
        const { event } = await setup();
        const ail = await createUser('ail');

        const res = await register(ail.id, event.id);

        assert.equal(res.status, 201);
        assert.equal(await prisma.registration.count(), 1);
    });

    it('inscribirse dos veces al mismo evento da 409 con mensaje claro', async () => {
        const { event } = await setup();
        const ail = await createUser('ail');

        await register(ail.id, event.id);
        const res = await register(ail.id, event.id);

        assert.equal(res.status, 409);
        assert.equal(res.body.error, 'Ya estás inscrito en este evento');
        assert.equal(await prisma.registration.count(), 1);
    });

    it('usuarios distintos pueden inscribirse al mismo evento', async () => {
        const { event } = await setup();
        const a = await createUser('ail');
        const b = await createUser('dt');

        assert.equal((await register(a.id, event.id)).status, 201);
        assert.equal((await register(b.id, event.id)).status, 201);
        assert.equal(await prisma.registration.count(), 2);
    });

    it('el mismo usuario puede inscribirse a eventos distintos', async () => {
        const { admin, event } = await setup();
        const other = await makeEvent(admin.id);
        const ail = await createUser('ail');

        assert.equal((await register(ail.id, event.id)).status, 201);
        assert.equal((await register(ail.id, other.id)).status, 201);
    });

    it('doble clic simultáneo: una inscripción y un 409', async () => {
        const { event } = await setup();
        const ail = await createUser('ail');

        const results = await Promise.all([
            register(ail.id, event.id),
            register(ail.id, event.id),
        ]);
        const statuses = results.map((r) => r.status).sort((a, b) => a - b);

        assert.deepEqual(statuses, [201, 409]);
        assert.equal(await prisma.registration.count(), 1);
    });

    it('la base de datos rechaza el duplicado aunque se salte la aplicación', async () => {
        const { event } = await setup();
        const ail = await createUser('ail');
        const data = { eventId: event.id, userId: ail.id };

        await prisma.registration.create({ data });

        await assert.rejects(
            prisma.registration.create({ data }),
            (e) =>
                e instanceof Prisma.PrismaClientKnownRequestError &&
                e.code === 'P2002',
        );
        assert.equal(await prisma.registration.count(), 1);
    });

    it('aforo completo: el siguiente recibe 409', async () => {
        const { event } = await setup({ capacity: 1 });
        const a = await createUser('ail');
        const b = await createUser('ail');

        assert.equal((await register(a.id, event.id)).status, 201);

        const res = await register(b.id, event.id);

        assert.equal(res.status, 409);
        assert.equal(res.body.error, 'El evento está completo');
        assert.equal(await prisma.registration.count(), 1);
    });

    it('carrera por el último cupo: 5 usuarios a la vez, solo 1 entra', async () => {
        const { event } = await setup({ capacity: 1 });
        const users = await Promise.all(
            Array.from({ length: 5 }, () => createUser('ail')),
        );

        const results = await Promise.all(
            users.map((u) => register(u.id, event.id)),
        );
        const statuses = results.map((r) => r.status).sort((a, b) => a - b);

        assert.deepEqual(statuses, [201, 409, 409, 409, 409]);
        assert.equal(await prisma.registration.count(), 1);
    });

    it('evento ya finalizado: 409', async () => {
        const { event } = await setup({ past: true });
        const ail = await createUser('ail');

        const res = await register(ail.id, event.id);

        assert.equal(res.status, 409);
        assert.equal(await prisma.registration.count(), 0);
    });

    it('evento inexistente: 404; id mal formado: 400', async () => {
        const ail = await createUser('ail');

        const missing = await register(
            ail.id,
            '11111111-1111-4111-8111-111111111111',
        );
        const malformed = await register(ail.id, 'no-es-un-uuid');

        assert.equal(missing.status, 404);
        assert.equal(malformed.status, 400);
    });

    it('sin sesión: 401; sin Origin: 403; en ambos casos no se inscribe a nadie', async () => {
        const { event } = await setup();
        const ail = await createUser('ail');

        const anon = await api(
            server.baseUrl,
            'POST',
            `/api/events/${event.id}/registrations`,
        );
        const noOrigin = await api(
            server.baseUrl,
            'POST',
            `/api/events/${event.id}/registrations`,
            { cookie: await sessionCookieFor(ail.id), origin: null },
        );

        assert.equal(anon.status, 401);
        assert.equal(noOrigin.status, 403);
        assert.equal(await prisma.registration.count(), 0);
    });

    it('cancelar la propia inscripción: 204; repetir da 404; se puede volver a inscribir', async () => {
        const { event } = await setup();
        const ail = await createUser('ail');

        await register(ail.id, event.id);

        assert.equal((await unregister(ail.id, event.id)).status, 204);
        assert.equal(await prisma.registration.count(), 0);
        assert.equal((await unregister(ail.id, event.id)).status, 404);
        assert.equal((await register(ail.id, event.id)).status, 201);
    });

    it('un usuario no puede cancelar la inscripción de otro', async () => {
        const { event } = await setup();
        const a = await createUser('ail');
        const b = await createUser('ail');

        await register(a.id, event.id);

        const res = await unregister(b.id, event.id);

        assert.equal(res.status, 404);
        assert.equal(await prisma.registration.count(), 1);
    });

    it('el listado indica si el usuario está inscrito y cuántos hay', async () => {
        const { event } = await setup();
        const a = await createUser('ail');
        const b = await createUser('ail');

        await register(a.id, event.id);

        const forA = (await listFor(a.id)).body.events[0];
        const forB = (await listFor(b.id)).body.events[0];

        assert.equal(forA.registered, true);
        assert.equal(forB.registered, false);
        assert.equal(forA._count.registrations, 1);
        assert.equal(forB._count.registrations, 1);
    });

    it('un dt que crea el evento también puede inscribirse, pero solo una vez', async () => {
        const dt = await createUser('dt');
        const ownedByDt = await makeEvent(dt.id);

        assert.equal((await register(dt.id, ownedByDt.id)).status, 201);
        assert.equal(await prisma.registration.count(), 1);

        // La unicidad se mantiene también para el creador.
        const again = await register(dt.id, ownedByDt.id);

        assert.equal(again.status, 409);
        assert.equal(again.body.error, 'Ya estás inscrito en este evento');
        assert.equal(await prisma.registration.count(), 1);
    });

    it('un admin nunca puede inscribirse, ni siquiera en su propio evento', async () => {
        const admin = await createUser('admin');
        const ownedByAdmin = await makeEvent(admin.id);

        const res = await register(admin.id, ownedByAdmin.id);

        assert.equal(res.status, 403);
        assert.equal(
            res.body.error,
            'Los administradores no pueden inscribirse en eventos',
        );
        assert.equal(await prisma.registration.count(), 0);
    });

    it('un DT puede pulsar Inscribirme, pero nunca cuenta ni ocupa plaza', async () => {
        const { event } = await setup({ capacity: 1 });
        const dt = await createUser('dt');
        const ail = await createUser('ail');

        assert.equal((await register(dt.id, event.id)).status, 201);

        // El DT ve su propia inscripción, pero no suma para nadie.
        const forDt = (await listFor(dt.id)).body.events[0];

        assert.equal(forDt.registered, true);
        assert.equal(forDt._count.registrations, 0);

        // No ocupa la única plaza: un AIL todavía puede inscribirse.
        assert.equal((await register(ail.id, event.id)).status, 201);

        const forAil = (await listFor(ail.id)).body.events[0];

        assert.equal(forAil._count.registrations, 1);
        assert.equal(await prisma.registration.count(), 2);
    });

    it('si un inscrito pasa a ser DT, deja de contarse; otro inscrito sí cuenta', async () => {
        const { event } = await setup();
        const user = await createUser('ail');
        const other = await createUser('ail');

        await register(user.id, event.id);
        await register(other.id, event.id);

        assert.equal(
            (await listFor(other.id)).body.events[0]._count.registrations,
            2,
        );

        await prisma.user.update({
            where: { id: user.id },
            data: { roleId: 'dt' },
        });

        // Solo queda "other": el ex-AIL ya es DT y se oculta.
        assert.equal(
            (await listFor(other.id)).body.events[0]._count.registrations,
            1,
        );
    });

    it('eliminar un evento cuenta en la auditoría solo las inscripciones visibles', async () => {
        const { admin, event } = await setup();
        const dt = await createUser('dt');
        const ail = await createUser('ail');

        await register(dt.id, event.id);
        await register(ail.id, event.id);

        const res = await api(
            server.baseUrl,
            'DELETE',
            `/api/events/${event.id}`,
            {
                cookie: await sessionCookieFor(admin.id),
            },
        );

        assert.equal(res.status, 204);
        // Las dos filas se borran en cascada; la auditoría cuenta solo la visible.
        assert.equal(await prisma.registration.count(), 0);

        const log = await prisma.auditLog.findFirstOrThrow({
            where: { action: 'event_deleted' },
        });

        assert.equal(log.newValue, '1 inscripción');
    });
    describe('lista de inscritos', () => {
        const attendeesOf = async (userId: string, eventId: string) =>
            api(server.baseUrl, 'GET', `/api/events/${eventId}/registrations`, {
                cookie: await sessionCookieFor(userId),
            });

        it('muestra Punto Vuela y nombre de cada inscrito, ordenados por Punto Vuela y nombre', async () => {
            const { admin, event } = await setup();
            const b = await createUser('ail');
            const a1 = await createUser('ail');
            const a2 = await createUser('ail');

            await prisma.user.update({
                where: { id: b.id },
                data: { name: 'Zoe', puntoVuela: 'Benamargosa' },
            });
            await prisma.user.update({
                where: { id: a1.id },
                data: { name: 'Marta', puntoVuela: 'Almáchar' },
            });
            await prisma.user.update({
                where: { id: a2.id },
                data: { name: 'Alba', puntoVuela: 'Almáchar' },
            });

            for (const u of [b, a1, a2]) await register(u.id, event.id);

            const res = await attendeesOf(admin.id, event.id);

            assert.equal(res.status, 200);
            assert.deepEqual(
                res.body.registrations.map(
                    (r: { puntoVuela: string; name: string }) =>
                        `${r.puntoVuela} (${r.name})`,
                ),
                ['Almáchar (Alba)', 'Almáchar (Marta)', 'Benamargosa (Zoe)'],
            );
        });

        it('cualquier persona autenticada la ve, pero solo recibe nombre y Punto Vuela (nunca correos ni ids de usuario)', async () => {
            const { event } = await setup();
            const ail = await createUser('ail');
            const viewer = await createUser('ail');

            await register(ail.id, event.id);

            const res = await attendeesOf(viewer.id, event.id);

            assert.equal(res.status, 200);
            assert.equal(res.body.registrations.length, 1);
            assert.deepEqual(Object.keys(res.body.registrations[0]).sort(), [
                'id',
                'name',
                'puntoVuela',
            ]);
            assert.ok(
                !JSON.stringify(res.body).includes('@'),
                'no debe haber correos',
            );
            assert.ok(
                !JSON.stringify(res.body).includes(ail.id),
                'no debe haber ids de usuario',
            );
        });

        it('los DT nunca aparecen en la lista; otros roles sí', async () => {
            const { event } = await setup();
            const dt = await createUser('dt');
            const ail = await createUser('ail');

            for (const u of [dt, ail]) await register(u.id, event.id);

            const res = await attendeesOf(ail.id, event.id);
            const names = res.body.registrations.map(
                (r: { name: string }) => r.name,
            );

            assert.equal(res.body.registrations.length, 1);
            assert.ok(!names.includes(dt.name));
            assert.ok(names.includes(ail.name));
        });

        it('un evento sin inscritos devuelve una lista vacía', async () => {
            const { admin, event } = await setup();

            const res = await attendeesOf(admin.id, event.id);

            assert.equal(res.status, 200);
            assert.deepEqual(res.body.registrations, []);
        });

        it('evento inexistente: 404; id mal formado: 400; sin sesión: 401', async () => {
            const admin = await createUser('admin');

            assert.equal(
                (
                    await attendeesOf(
                        admin.id,
                        '11111111-1111-4111-8111-111111111111',
                    )
                ).status,
                404,
            );
            assert.equal((await attendeesOf(admin.id, 'no-uuid')).status, 400);
            assert.equal(
                (
                    await api(
                        server.baseUrl,
                        'GET',
                        '/api/events/11111111-1111-4111-8111-111111111111/registrations',
                    )
                ).status,
                401,
            );
        });

        it('el número de inscritos del listado coincide con la lista', async () => {
            const { admin, event } = await setup();
            const dt = await createUser('dt');
            const ail = await createUser('ail');

            for (const u of [dt, ail]) await register(u.id, event.id);

            const list = (await listFor(admin.id)).body.events[0];
            const attendees = (await attendeesOf(admin.id, event.id)).body
                .registrations;

            assert.equal(list._count.registrations, attendees.length);
        });
    });
});
