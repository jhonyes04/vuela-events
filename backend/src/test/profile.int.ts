import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../lib/prisma.js';
import {
    api,
    closeDb,
    createCategory,
    createGuide,
    createUser,
    resetDb,
    sessionCookieFor,
    startServer,
} from './helpers.js';

const validProfile = {
    name: 'Ana Vanesa',
    lastName: 'García López',
    puntoVuela: 'Pueblo Nuevo Axarquía',
};

describe('perfil: primer acceso y edición', () => {
    let server: Awaited<ReturnType<typeof startServer>>;
    let categoryId: string;
    let guideId: string;

    before(async () => {
        server = await startServer();
    });

    beforeEach(async () => {
        await resetDb();
        categoryId = (await createCategory()).id;
        guideId = (await createGuide()).id;
    });

    after(async () => {
        await server.close();
        await closeDb();
    });

    const patch = async (userId: string, body: unknown) =>
        api(server.baseUrl, 'PATCH', '/api/profile', {
            cookie: await sessionCookieFor(userId),
            body,
        });

    const me = async (userId: string) =>
        (
            await api(server.baseUrl, 'GET', '/api/auth/me', {
                cookie: await sessionCookieFor(userId),
            })
        ).body.user;

    // Función porque categoryId cambia cada test (resetDb borra las categorías).
    const newEvent = () => ({
        title: 'Evento',
        location: 'Sala',
        startsAt: '2030-01-10T10:00:00.000Z',
        endsAt: '2030-01-10T12:00:00.000Z',
        categoryId,
        guideId,
    });

    describe('primer acceso', () => {
        it('un usuario nuevo llega con el perfil sin completar', async () => {
            const user = await createUser('ail', { profileCompleted: false });

            const current = await me(user.id);

            assert.equal(current.profileCompleted, false);
            assert.equal(current.puntoVuela, null);
        });

        it('completar el perfil guarda nombre y Punto Vuela y lo marca como completado', async () => {
            const user = await createUser('ail', { profileCompleted: false });

            const res = await patch(user.id, validProfile);

            assert.equal(res.status, 200);
            assert.equal(res.body.user.name, validProfile.name);
            assert.equal(res.body.user.puntoVuela, validProfile.puntoVuela);
            assert.equal(res.body.user.profileCompleted, true);

            const row = await prisma.user.findUniqueOrThrow({
                where: { id: user.id },
            });

            assert.ok(row.profileCompletedAt);
            assert.equal((await me(user.id)).profileCompleted, true);
        });

        it('un DT también lo completa, con su zona en lugar de un Punto Vuela', async () => {
            const dt = await createUser('dt', { profileCompleted: false });

            const res = await patch(dt.id, {
                name: 'Lucía',
                lastName: 'Pérez Ruiz',
                puntoVuela: 'DT Axarquía y Sierra de las Nieves',
            });

            assert.equal(res.status, 200);
            assert.equal(
                res.body.user.puntoVuela,
                'DT Axarquía y Sierra de las Nieves',
            );
        });

        it('sin el perfil completo NO se puede inscribir ni crear eventos: 403 y no se escribe nada', async () => {
            const ail = await createUser('ail', { profileCompleted: false });
            const dt = await createUser('dt', { profileCompleted: false });
            const owner = await createUser('admin');
            const event = await prisma.event.create({
                data: {
                    title: 'Existente',
                    startsAt: new Date(Date.now() + 86_400_000),
                    endsAt: new Date(Date.now() + 90_000_000),
                    createdById: owner.id,
                    categoryId,
                    guideId,
                },
            });

            const register = await api(
                server.baseUrl,
                'POST',
                `/api/events/${event.id}/registrations`,
                { cookie: await sessionCookieFor(ail.id) },
            );
            const create = await api(server.baseUrl, 'POST', '/api/events', {
                cookie: await sessionCookieFor(dt.id),
                body: newEvent(),
            });
            const series = await api(
                server.baseUrl,
                'POST',
                '/api/events/recurring',
                {
                    cookie: await sessionCookieFor(dt.id),
                    body: {
                        title: 'Serie',
                        location: 'Sala',
                        from: '2027-01-01',
                        to: '2027-01-31',
                        weekdays: [3],
                        startTime: '09:00',
                        endTime: '13:00',
                    },
                },
            );

            assert.equal(register.status, 403);
            assert.equal(create.status, 403);
            assert.equal(series.status, 403);
            assert.match(register.body.error, /perfil/);
            assert.equal(await prisma.registration.count(), 0);
            assert.equal(await prisma.event.count(), 1);
        });

        it('al completar el perfil ya puede inscribirse y crear eventos', async () => {
            const ail = await createUser('ail', { profileCompleted: false });
            const dt = await createUser('dt', { profileCompleted: false });
            const owner = await createUser('admin');
            const event = await prisma.event.create({
                data: {
                    title: 'Existente',
                    startsAt: new Date(Date.now() + 86_400_000),
                    endsAt: new Date(Date.now() + 90_000_000),
                    createdById: owner.id,
                    categoryId,
                    guideId,
                },
            });

            await patch(ail.id, validProfile);
            await patch(dt.id, validProfile);

            const register = await api(
                server.baseUrl,
                'POST',
                `/api/events/${event.id}/registrations`,
                { cookie: await sessionCookieFor(ail.id) },
            );
            const create = await api(server.baseUrl, 'POST', '/api/events', {
                cookie: await sessionCookieFor(dt.id),
                body: newEvent(),
            });

            assert.equal(register.status, 201);
            assert.equal(create.status, 201);
        });
    });

    describe('edición', () => {
        it('se puede cambiar el nombre y el Punto Vuela, y lo nuevo queda guardado', async () => {
            const user = await createUser('ail');

            const res = await patch(user.id, {
                name: 'Nombre Nuevo',
                lastName: 'Apellido Nuevo',
                puntoVuela: 'Almáchar',
            });

            assert.equal(res.status, 200);
            assert.equal((await me(user.id)).name, 'Nombre Nuevo');
            assert.equal((await me(user.id)).puntoVuela, 'Almáchar');
        });

        it('recorta y colapsa los espacios; un salto de línea o tabulador pasa a ser un espacio', async () => {
            const user = await createUser('ail');

            const res = await patch(user.id, {
                name: '  Ana    García   ',
                lastName: '  López   Ruiz  ',
                puntoVuela: '   Benamargosa  ',
            });

            assert.equal(res.status, 200);
            assert.equal(res.body.user.name, 'Ana García');
            assert.equal(res.body.user.puntoVuela, 'Benamargosa');

            const multiline = await patch(user.id, {
                name: 'Ana\nGarcía\tLópez',
                lastName: 'Pérez\nRuiz',
                puntoVuela: 'Sierra\r\nde las Nieves',
            });

            assert.equal(multiline.status, 200);
            assert.equal(multiline.body.user.name, 'Ana García López');
            assert.equal(
                multiline.body.user.puntoVuela,
                'Sierra de las Nieves',
            );
        });

        it('admite acentos, apóstrofos, guiones y otros alfabetos en los nombres', async () => {
            const user = await createUser('ail');

            for (const name of [
                "María-José O'Brien",
                'Zoë Łukasiewicz',
                'Ñandú Pérez',
            ]) {
                assert.equal(
                    (
                        await patch(user.id, {
                            name,
                            lastName: name,
                            puntoVuela: 'Lugar',
                        })
                    ).status,
                    200,
                    name,
                );
            }
        });

        it('deja auditoría con los NOMBRES de los campos cambiados, no con sus valores', async () => {
            const user = await createUser('ail');

            await patch(user.id, {
                name: 'Nombre Distinto',
                lastName: 'Apellido Distinto',
                puntoVuela: 'Lugar Distinto',
            });

            const log = await prisma.auditLog.findFirstOrThrow({
                where: { action: 'profile_updated' },
            });

            assert.equal(log.actorId, user.id);
            assert.equal(log.newValue, 'name,lastName,puntoVuela');
            assert.ok(!log.newValue?.includes('Distinto'));
        });

        it('guardar sin cambios no genera auditoría ni altera la fecha de completado', async () => {
            const user = await createUser('ail');
            const before = await prisma.user.findUniqueOrThrow({
                where: { id: user.id },
            });

            const res = await patch(user.id, {
                name: before.name,
                lastName: before.lastName,
                puntoVuela: before.puntoVuela,
            });

            assert.equal(res.status, 200);
            assert.equal(await prisma.auditLog.count(), 0);

            const after = await prisma.user.findUniqueOrThrow({
                where: { id: user.id },
            });

            assert.equal(
                after.profileCompletedAt?.getTime(),
                before.profileCompletedAt?.getTime(),
            );
        });

        it('la primera vez queda como profile_completed en la auditoría', async () => {
            const user = await createUser('ail', { profileCompleted: false });

            await patch(user.id, validProfile);

            const log = await prisma.auditLog.findFirstOrThrow();

            assert.equal(log.action, 'profile_completed');
        });
    });

    describe('seguridad', () => {
        it('sin sesión: 401; sin Origin: 403; en ambos casos no cambia nada', async () => {
            const user = await createUser('ail');

            const anon = await api(server.baseUrl, 'PATCH', '/api/profile', {
                body: validProfile,
            });
            const noOrigin = await api(
                server.baseUrl,
                'PATCH',
                '/api/profile',
                {
                    cookie: await sessionCookieFor(user.id),
                    body: validProfile,
                    origin: null,
                },
            );

            assert.equal(anon.status, 401);
            assert.equal(noOrigin.status, 403);
            assert.notEqual((await me(user.id)).name, validProfile.name);
        });

        it('no se puede colar otro campo: role, active, email, googleSub o id → 400 y no cambia nada', async () => {
            const user = await createUser('ail');
            const other = await createUser('ail');

            for (const extra of [
                { roleId: 'admin' },
                { active: false },
                { email: 'otro@puntosvuela.es' },
                { googleSub: 'x' },
                { id: other.id },
                { profileCompletedAt: null },
            ]) {
                const res = await patch(user.id, { ...validProfile, ...extra });

                assert.equal(res.status, 400, JSON.stringify(extra));
            }

            const row = await prisma.user.findUniqueOrThrow({
                where: { id: user.id },
            });

            assert.equal(row.roleId, 'ail');
            assert.equal(row.active, true);
            assert.notEqual(row.name, validProfile.name);
        });

        it('cada persona edita SOLO su perfil: el de otra no cambia', async () => {
            const user = await createUser('ail');
            const other = await createUser('ail');
            const otherBefore = await prisma.user.findUniqueOrThrow({
                where: { id: other.id },
            });

            await patch(user.id, validProfile);

            const otherAfter = await prisma.user.findUniqueOrThrow({
                where: { id: other.id },
            });

            assert.equal(otherAfter.name, otherBefore.name);
            assert.equal(otherAfter.puntoVuela, otherBefore.puntoVuela);
        });

        it('valores no válidos: 400 y no cambia nada', async () => {
            const user = await createUser('ail');
            const cases: [string, unknown][] = [
                ['nombre de 1 carácter', { ...validProfile, name: 'A' }],
                ['nombre vacío', { ...validProfile, name: '   ' }],
                [
                    'nombre demasiado largo',
                    { ...validProfile, name: 'a'.repeat(201) },
                ],
                [
                    'Punto Vuela de 1 carácter',
                    { ...validProfile, puntoVuela: 'A' },
                ],
                [
                    'Punto Vuela demasiado largo',
                    { ...validProfile, puntoVuela: 'a'.repeat(121) },
                ],
                [
                    'etiquetas HTML en el nombre',
                    { ...validProfile, name: 'Ana <b>García</b>' },
                ],
                [
                    'etiquetas HTML en el Punto Vuela',
                    { ...validProfile, puntoVuela: '<script>x</script>' },
                ],
                [
                    'carácter de control',
                    { ...validProfile, name: 'Ana\u0000García' },
                ],
                ['solo símbolos', { ...validProfile, name: '..--..' }],
                ['falta el Punto Vuela', { name: validProfile.name }],
                ['falta el nombre', { puntoVuela: validProfile.puntoVuela }],
                ['tipos incorrectos', { name: 5, puntoVuela: ['x'] }],
                ['cuerpo vacío', {}],
            ];

            for (const [name, body] of cases) {
                assert.equal((await patch(user.id, body)).status, 400, name);
            }

            assert.notEqual((await me(user.id)).name, validProfile.name);
        });
    });
});
