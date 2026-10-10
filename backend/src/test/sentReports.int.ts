import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../lib/prisma.js';
import { saveSentReport } from '../services/sentReports.js';
import {
    closeDb,
    createProject,
    createGuide,
    createUser,
    resetDb,
    sessionCookieFor,
    startServer,
} from './helpers.js';

const PDF = Buffer.from('%PDF-1.4 acta de prueba');

describe('partes de firmas guardados: listado y descarga', () => {
    let server: Awaited<ReturnType<typeof startServer>>;
    let sender: Awaited<ReturnType<typeof createUser>>;
    let recipient: Awaited<ReturnType<typeof createUser>>;
    let stranger: Awaited<ReturnType<typeof createUser>>;
    let reportId: string;

    before(async () => {
        server = await startServer();
    });

    beforeEach(async () => {
        await resetDb();

        sender = await createUser('dt');
        recipient = await createUser('ail');
        stranger = await createUser('ail');

        const event = await prisma.event.create({
            data: {
                title: 'Taller de robótica',
                location: 'Sala 1',
                startsAt: new Date('2030-01-10T10:00:00.000Z'),
                endsAt: new Date('2030-01-10T12:00:00.000Z'),
                createdById: sender.id,
                projectId: (await createProject()).id,
                guideId: (await createGuide()).id,
            },
        });

        await saveSentReport({
            eventId: event.id,
            senderId: sender.id,
            filename: '2030-01-10 Acta de asistencia Taller de robótica.pdf',
            pdf: PDF,
            recipientUserIds: [recipient.id],
        });

        reportId = (await prisma.sentReport.findFirstOrThrow()).id;
    });

    after(async () => {
        await server.close();
        await closeDb();
    });

    const get = async (userId: string | null, path: string) => {
        const res = await fetch(`${server.baseUrl}/api${path}`, {
            headers: userId
                ? { Cookie: await sessionCookieFor(userId) }
                : undefined,
        });

        return { status: res.status, res };
    };

    const listFor = async (userId: string, query = '') => {
        const { status, res } = await get(userId, `/profile/reports${query}`);

        return { status, body: (await res.json()) as any };
    };

    it('quien lo envió lo ve en su listado, marcado como enviado por él', async () => {
        const { status, body } = await listFor(sender.id);

        assert.equal(status, 200);
        assert.equal(body.reports.length, 1);
        assert.equal(body.reports[0].id, reportId);
        assert.equal(body.reports[0].sentByMe, true);
        assert.equal(body.reports[0].event.title, 'Taller de robótica');
    });

    it('quien lo recibió lo ve, pero no como enviado por él', async () => {
        const { body } = await listFor(recipient.id);

        assert.equal(body.reports.length, 1);
        assert.equal(body.reports[0].sentByMe, false);
    });

    it('el listado no expone el PDF ni los ids de los destinatarios', async () => {
        const { body } = await listFor(sender.id);
        const report = body.reports[0];

        assert.equal('pdf' in report, false);
        assert.equal('recipientUserIds' in report, false);
        assert.equal('senderId' in report, false);
    });

    it('quien no lo envió ni lo recibió no lo ve', async () => {
        const { body } = await listFor(stranger.id);

        assert.deepEqual(body.reports, []);
    });

    it('la búsqueda filtra por título del evento, sin distinguir mayúsculas', async () => {
        assert.equal(
            (await listFor(sender.id, '?q=ROBÓTICA')).body.reports.length,
            1,
        );
        assert.equal(
            (await listFor(sender.id, '?q=otro')).body.reports.length,
            0,
        );
    });

    it('descarga el PDF original, con su nombre, para el remitente y el destinatario', async () => {
        for (const user of [sender, recipient]) {
            const { status, res } = await get(
                user.id,
                `/profile/reports/${reportId}/pdf`,
            );

            assert.equal(status, 200);
            assert.equal(res.headers.get('content-type'), 'application/pdf');
            assert.match(
                res.headers.get('content-disposition') ?? '',
                /filename\*=UTF-8''2030-01-10%20Acta/,
            );
            assert.deepEqual(Buffer.from(await res.arrayBuffer()), PDF);
        }
    });

    it('un tercero no puede descargarlo: 404, igual que si no existiera', async () => {
        const { status } = await get(
            stranger.id,
            `/profile/reports/${reportId}/pdf`,
        );

        assert.equal(status, 404);
    });

    it('sin sesión: 401; id mal formado: 400', async () => {
        assert.equal((await get(null, '/profile/reports')).status, 401);
        assert.equal(
            (await get(null, `/profile/reports/${reportId}/pdf`)).status,
            401,
        );
        assert.equal(
            (await get(sender.id, '/profile/reports/no-es-un-uuid/pdf')).status,
            400,
        );
    });

    it('al eliminar el evento se elimina también la copia del acta', async () => {
        await prisma.event.deleteMany();

        assert.equal(await prisma.sentReport.count(), 0);
    });
});
