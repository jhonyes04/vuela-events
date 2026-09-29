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

describe('administración de usuarios', () => {
    let server: Awaited<ReturnType<typeof startServer>>;
    let categoryId: string;

    before(async () => {
        server = await startServer();
    });

    beforeEach(async () => {
        await resetDb();
        categoryId = (await createCategory()).id;
    });

    // categoryId cambia cada test (resetDb borra las categorías).
    const newEvent = () => ({
        title: 'Evento',
        location: 'Sala de pruebas',
        startsAt: '2030-01-10T10:00:00.000Z',
        endsAt: '2030-01-10T12:00:00.000Z',
        categoryId,
    });

    after(async () => {
        await server.close();
        await closeDb();
    });

    const patch = async (
        actorId: string,
        path: string,
        body: unknown,
        origin?: string | null,
    ) =>
        api(server.baseUrl, 'PATCH', path, {
            cookie: await sessionCookieFor(actorId),
            body,
            origin,
        });

    const setRole = (actorId: string, targetId: string, roleId: string) =>
        patch(actorId, `/api/users/${targetId}/role`, { roleId });

    const setActive = (actorId: string, targetId: string, active: boolean) =>
        patch(actorId, `/api/users/${targetId}/active`, { active });

    const roleOf = async (id: string) =>
        (await prisma.user.findUniqueOrThrow({ where: { id } })).roleId;

    describe('cambio de roles', () => {
        it('ail NO puede cambiar roles ni elevarse a sí mismo', async () => {
            const ail = await createUser('ail');
            const other = await createUser('ail');

            assert.equal(
                (await setRole(ail.id, other.id, 'admin')).status,
                403,
            );
            assert.equal((await setRole(ail.id, ail.id, 'admin')).status, 403);
            assert.equal(await roleOf(other.id), 'ail');
            assert.equal(await roleOf(ail.id), 'ail');
        });

        it('dt NO puede cambiar roles ni elevarse a sí mismo', async () => {
            const dt = await createUser('dt');
            const other = await createUser('ail');

            assert.equal((await setRole(dt.id, other.id, 'admin')).status, 403);
            assert.equal((await setRole(dt.id, dt.id, 'admin')).status, 403);
            assert.equal(await roleOf(other.id), 'ail');
            assert.equal(await roleOf(dt.id), 'dt');
        });

        it('solo admin puede listar usuarios', async () => {
            const ail = await createUser('ail');
            const dt = await createUser('dt');
            const admin = await createUser('admin');
            const list = async (id: string) =>
                api(server.baseUrl, 'GET', '/api/users', {
                    cookie: await sessionCookieFor(id),
                });

            assert.equal((await list(ail.id)).status, 403);
            assert.equal((await list(dt.id)).status, 403);
            assert.equal((await list(admin.id)).status, 200);
        });

        it('admin cambia un rol y queda registrado en auditoría', async () => {
            const admin = await createUser('admin');
            const ail = await createUser('ail');

            const res = await setRole(admin.id, ail.id, 'dt');

            assert.equal(res.status, 200);
            assert.equal(await roleOf(ail.id), 'dt');

            const logs = await prisma.auditLog.findMany();

            assert.equal(logs.length, 1);
            assert.equal(logs[0]?.action, 'role_change');
            assert.equal(logs[0]?.actorId, admin.id);
            assert.equal(logs[0]?.targetId, ail.id);
            assert.equal(logs[0]?.oldValue, 'ail');
            assert.equal(logs[0]?.newValue, 'dt');
        });

        it('el rol se lee de la DB en cada petición: surte efecto en una sesión ya abierta', async () => {
            const admin = await createUser('admin');
            const user = await createUser('ail');
            const cookie = await sessionCookieFor(user.id);
            const create = () =>
                api(server.baseUrl, 'POST', '/api/events', {
                    cookie,
                    body: newEvent(),
                });

            assert.equal((await create()).status, 403);

            await setRole(admin.id, user.id, 'dt');
            assert.equal((await create()).status, 201);

            await setRole(admin.id, user.id, 'ail');
            assert.equal((await create()).status, 403);
        });

        it('admin no puede cambiar su propio rol', async () => {
            const admin = await createUser('admin');

            const res = await setRole(admin.id, admin.id, 'ail');

            assert.equal(res.status, 400);
            assert.equal(await roleOf(admin.id), 'admin');
        });

        it('rol inexistente: 404; campos extra: 400 y no cambia nada', async () => {
            const admin = await createUser('admin');
            const ail = await createUser('ail');
            const path = `/api/users/${ail.id}/role`;

            assert.equal(
                (await setRole(admin.id, ail.id, 'superadmin')).status,
                404,
            );
            assert.equal(
                (await patch(admin.id, path, { roleId: 'dt', active: false }))
                    .status,
                400,
            );
            assert.equal(await roleOf(ail.id), 'ail');
        });

        it('id mal formado: 400; usuario inexistente: 404', async () => {
            const admin = await createUser('admin');

            assert.equal(
                (await setRole(admin.id, 'no-uuid', 'dt')).status,
                400,
            );
            assert.equal(
                (
                    await setRole(
                        admin.id,
                        '11111111-1111-4111-8111-111111111111',
                        'dt',
                    )
                ).status,
                404,
            );
        });

        it('sin cabecera Origin: 403 y el rol no cambia', async () => {
            const admin = await createUser('admin');
            const ail = await createUser('ail');

            const res = await patch(
                admin.id,
                `/api/users/${ail.id}/role`,
                { role: 'dt' },
                null,
            );

            assert.equal(res.status, 403);
            assert.equal(await roleOf(ail.id), 'ail');
        });

        it('pedir el mismo rol no escribe auditoría', async () => {
            const admin = await createUser('admin');
            const ail = await createUser('ail');

            const res = await setRole(admin.id, ail.id, 'ail');

            assert.equal(res.status, 200);
            assert.equal(await prisma.auditLog.count(), 0);
        });

        it('dos admins degradándose a la vez: nunca se queda el sistema sin admin', async () => {
            const a = await createUser('admin');
            const b = await createUser('admin');

            const [r1, r2] = await Promise.all([
                setRole(a.id, b.id, 'ail'),
                setRole(b.id, a.id, 'ail'),
            ]);
            const admins = await prisma.user.count({
                where: { roleId: 'admin', active: true },
            });

            assert.ok(admins >= 1, `admins activos: ${admins}`);
            assert.ok(!(r1.status === 200 && r2.status === 200));
        });
    });

    describe('activar y desactivar', () => {
        it('ail y dt NO pueden desactivar a nadie', async () => {
            const ail = await createUser('ail');
            const dt = await createUser('dt');
            const target = await createUser('ail');

            assert.equal(
                (await setActive(ail.id, target.id, false)).status,
                403,
            );
            assert.equal(
                (await setActive(dt.id, target.id, false)).status,
                403,
            );
            assert.equal(
                (
                    await prisma.user.findUniqueOrThrow({
                        where: { id: target.id },
                    })
                ).active,
                true,
            );
        });

        it('desactivar corta sus sesiones al instante y deja auditoría', async () => {
            const admin = await createUser('admin');
            const ail = await createUser('ail');
            const cookie = await sessionCookieFor(ail.id);
            const me = () =>
                api(server.baseUrl, 'GET', '/api/auth/me', { cookie });

            assert.equal((await me()).status, 200);

            const res = await setActive(admin.id, ail.id, false);

            assert.equal(res.status, 200);
            assert.equal(res.body.user.active, false);
            assert.equal((await me()).status, 401);

            const rows = await prisma.$queryRaw<
                { n: number }[]
            >`SELECT count(*)::int AS n FROM "session" WHERE "sess"->>'userId' = ${ail.id}`;

            assert.equal(rows[0]?.n, 0);

            const log = await prisma.auditLog.findFirstOrThrow();

            assert.equal(log.action, 'active_change');
            assert.equal(log.oldValue, 'true');
            assert.equal(log.newValue, 'false');
        });

        it('admin no puede desactivarse a sí mismo', async () => {
            const admin = await createUser('admin');

            assert.equal(
                (await setActive(admin.id, admin.id, false)).status,
                400,
            );
            assert.equal(
                (
                    await prisma.user.findUniqueOrThrow({
                        where: { id: admin.id },
                    })
                ).active,
                true,
            );
        });

        it('un admin puede desactivar a otro admin si queda alguno activo', async () => {
            const a = await createUser('admin');
            const b = await createUser('admin');

            const res = await setActive(a.id, b.id, false);

            assert.equal(res.status, 200);
            assert.equal(res.body.user.active, false);
        });

        it('un admin desactivado no puede administrar', async () => {
            const a = await createUser('admin');
            const b = await createUser('admin');
            const target = await createUser('ail');
            const cookieB = await sessionCookieFor(b.id);

            await setActive(a.id, b.id, false);

            const res = await api(
                server.baseUrl,
                'PATCH',
                `/api/users/${target.id}/role`,
                { cookie: cookieB, body: { roleId: 'dt' } },
            );

            assert.equal(res.status, 401);
            assert.equal(await roleOf(target.id), 'ail');
        });

        it('reactivar devuelve el acceso con una sesión nueva', async () => {
            const admin = await createUser('admin');
            const ail = await createUser('ail');

            await setActive(admin.id, ail.id, false);

            const res = await setActive(admin.id, ail.id, true);

            assert.equal(res.status, 200);

            const me = await api(server.baseUrl, 'GET', '/api/auth/me', {
                cookie: await sessionCookieFor(ail.id),
            });

            assert.equal(me.status, 200);
        });

        it('dos admins desactivándose a la vez: nunca se queda el sistema sin admin', async () => {
            const a = await createUser('admin');
            const b = await createUser('admin');

            const [r1, r2] = await Promise.all([
                setActive(a.id, b.id, false),
                setActive(b.id, a.id, false),
            ]);
            const admins = await prisma.user.count({
                where: { roleId: 'admin', active: true },
            });

            assert.ok(admins >= 1, `admins activos: ${admins}`);
            assert.ok(!(r1.status === 200 && r2.status === 200));
        });
    });
});
