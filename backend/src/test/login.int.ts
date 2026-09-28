import { after, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import type { GoogleIdentity } from '../lib/google.js';
import { findOrCreateUser, LoginFailureError } from '../services/users.js';
import { closeDb, createUser, resetDb } from './helpers.js';

const identity = (
    n: string,
    over: Partial<GoogleIdentity> = {},
): GoogleIdentity => ({
    sub: `sub-${n}`,
    email: `${n}@${env.ALLOWED_EMAIL_DOMAIN}`,
    name: `Usuario ${n}`,
    ...over,
});

const rejectsWith = (promise: Promise<unknown>, reason: string) =>
    assert.rejects(
        promise,
        (e) => e instanceof LoginFailureError && e.reason === reason,
    );

describe('login: alta y acceso de usuarios', () => {
    beforeEach(resetDb);

    after(closeDb);

    it('un usuario nuevo entra con el rol mínimo (ail) y activo', async () => {
        const user = await findOrCreateUser(identity('nuevo'));

        assert.equal(user.role, 'ail');
        assert.equal(await prisma.user.count(), 1);

        const row = await prisma.user.findUniqueOrThrow({
            where: { id: user.id },
        });

        assert.equal(row.active, true);
    });

    it('un segundo login del mismo usuario no crea duplicados', async () => {
        const first = await findOrCreateUser(identity('repite'));
        const second = await findOrCreateUser(identity('repite'));

        assert.equal(first.id, second.id);
        assert.equal(await prisma.user.count(), 1);
    });

    it('el login conserva el rol que un admin haya asignado', async () => {
        const first = await findOrCreateUser(identity('promo'));

        await prisma.user.update({
            where: { id: first.id },
            data: { role: 'dt' },
        });

        const again = await findOrCreateUser(identity('promo'));

        assert.equal(again.role, 'dt');
    });

    it('sincroniza nombre y correo si cambian en Google', async () => {
        const first = await findOrCreateUser(identity('cambia'));

        await findOrCreateUser(
            identity('cambia', {
                name: 'Nombre nuevo',
                email: `nuevo-correo@${env.ALLOWED_EMAIL_DOMAIN}`,
            }),
        );

        const row = await prisma.user.findUniqueOrThrow({
            where: { id: first.id },
        });

        assert.equal(row.name, 'Nombre nuevo');
        assert.equal(row.email, `nuevo-correo@${env.ALLOWED_EMAIL_DOMAIN}`);
    });

    it('un usuario nuevo entra con el perfil sin completar', async () => {
        const user = await findOrCreateUser(identity('primera-vez'));

        assert.equal(user.profileCompleted, false);
        assert.equal(user.puntoVuela, null);
    });

    it('con el perfil completado, el nombre elegido por la persona NO se sobrescribe con el de Google; el correo sí se sincroniza', async () => {
        const first = await findOrCreateUser(identity('propio'));

        await prisma.user.update({
            where: { id: first.id },
            data: {
                name: 'Ana Vanesa García López',
                puntoVuela: 'Pueblo Nuevo Axarquía',
                profileCompletedAt: new Date(),
            },
        });

        const again = await findOrCreateUser(
            identity('propio', {
                name: 'nombre de google distinto',
                email: `correo-nuevo@${env.ALLOWED_EMAIL_DOMAIN}`,
            }),
        );

        assert.equal(again.name, 'Ana Vanesa García López');
        assert.equal(again.puntoVuela, 'Pueblo Nuevo Axarquía');
        assert.equal(again.profileCompleted, true);

        const row = await prisma.user.findUniqueOrThrow({
            where: { id: first.id },
        });

        assert.equal(row.name, 'Ana Vanesa García López');
        assert.equal(row.email, `correo-nuevo@${env.ALLOWED_EMAIL_DOMAIN}`);
    });

    it('una cuenta desactivada no puede entrar', async () => {
        await createUser('ail', {
            active: false,
            email: `baja@${env.ALLOWED_EMAIL_DOMAIN}`,
        });
        const row = await prisma.user.findFirstOrThrow();

        await rejectsWith(
            findOrCreateUser(
                identity('baja', { sub: row.googleSub, email: row.email }),
            ),
            'account_disabled',
        );
    });

    it('un email ya existente con otro googleSub se rechaza y no crea usuario', async () => {
        const existing = await createUser('ail');

        await rejectsWith(
            findOrCreateUser(
                identity('intruso', { sub: 'otro-sub', email: existing.email }),
            ),
            'email_conflict',
        );
        assert.equal(await prisma.user.count(), 1);
    });

    it('el admin inicial recibe rol admin solo si no existe ningún admin', async () => {
        const adminEmail = env.INITIAL_ADMIN_EMAIL;

        assert.ok(
            adminEmail,
            'INITIAL_ADMIN_EMAIL debe estar definido en .env',
        );

        const user = await findOrCreateUser(
            identity('inicial', { email: adminEmail }),
        );

        assert.equal(user.role, 'admin');
    });

    it('con un admin ya existente, INITIAL_ADMIN_EMAIL no concede admin', async () => {
        const adminEmail = env.INITIAL_ADMIN_EMAIL;

        assert.ok(
            adminEmail,
            'INITIAL_ADMIN_EMAIL debe estar definido en .env',
        );

        await createUser('admin');

        const user = await findOrCreateUser(
            identity('inicial2', { email: adminEmail }),
        );

        assert.equal(user.role, 'ail');
    });

    it('otro correo no obtiene admin aunque no haya ningún admin', async () => {
        const user = await findOrCreateUser(identity('cualquiera'));

        assert.equal(user.role, 'ail');
        assert.equal(await prisma.user.count({ where: { role: 'admin' } }), 0);
    });

    it('doble primer login simultáneo (doble clic): ambos entran y hay una sola fila', async () => {
        const id = identity('doble');

        const [a, b] = await Promise.all([
            findOrCreateUser(id),
            findOrCreateUser(id),
        ]);

        assert.equal(a.id, b.id);
        assert.equal(await prisma.user.count(), 1);
    });
});
