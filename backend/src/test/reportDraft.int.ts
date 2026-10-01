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

describe('parte de firmas: generar, revisar y enviar', () => {
    let server: Awaited<ReturnType<typeof startServer>>;
    let dt: Awaited<ReturnType<typeof createUser>>;
    let otherDt: Awaited<ReturnType<typeof createUser>>;
    let eventId: string;
    let registrationIds: string[];

    before(async () => {
        server = await startServer();
    });

    beforeEach(async () => {
        await resetDb();

        // En la base de pruebas solo admin tiene email:send (un DT lo recibe desde la gestión de roles).
        dt = await createUser('admin');
        otherDt = await createUser('admin');

        const event = await prisma.event.create({
            data: {
                title: 'Taller de robótica',
                location: 'Sala 1',
                startsAt: new Date('2030-01-10T10:00:00.000Z'),
                endsAt: new Date('2030-01-10T12:00:00.000Z'),
                createdById: dt.id,
                categoryId: (await createCategory()).id,
                guideId: (await createGuide()).id,
            },
        });

        eventId = event.id;
        registrationIds = [];

        for (let i = 0; i < 2; i += 1) {
            const registration = await prisma.registration.create({
                data: { eventId, userId: (await createUser('ail')).id },
            });

            registrationIds.push(registration.id);
        }
    });

    after(async () => {
        await server.close();
        await closeDb();
    });

    // Para llamar con el DT que genera el acta; devuelve la respuesta cruda.
    const generate = async (userId: string, ids: string[]) =>
        fetch(`${server.baseUrl}/api/events/${eventId}/attendance-report`, {
            method: 'POST',
            headers: {
                Cookie: await sessionCookieFor(userId),
                Origin: process.env['FRONTEND_ORIGIN'] ?? '',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ recipientRegistrationIds: ids }),
        });

    const send = async (userId: string, body: Record<string, unknown>) =>
        api(server.baseUrl, 'POST', '/api/email-sends', {
            cookie: await sessionCookieFor(userId),
            body: {
                slot: 'parte_firmas',
                eventId,
                recipientRegistrationIds: registrationIds,
                ...body,
            },
        });

    it('generar devuelve el PDF para visualizarlo y un id de borrador', async () => {
        const res = await generate(dt.id, registrationIds);
        const pdf = Buffer.from(await res.arrayBuffer());

        assert.equal(res.status, 200);
        assert.equal(res.headers.get('content-type'), 'application/pdf');
        assert.match(res.headers.get('content-disposition') ?? '', /^inline/);
        assert.match(
            res.headers.get('x-report-draft-id') ?? '',
            /^[0-9a-f-]{36}$/,
        );
        assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
    });

    it('un ail NO puede generar el parte: 403', async () => {
        const ail = await createUser('ail');
        const res = await generate(ail.id, registrationIds);

        assert.equal(res.status, 403);
    });

    it('enviar el parte sin haberlo generado: 400', async () => {
        const res = await send(dt.id, {});

        assert.equal(res.status, 400);
        assert.match(res.body.error, /Genera y revisa/);
    });

    it('un borrador inexistente o ajeno: 409', async () => {
        const mine = await generate(dt.id, registrationIds);
        const draftId = mine.headers.get('x-report-draft-id');

        const unknown = await send(dt.id, {
            reportDraftId: '00000000-0000-4000-8000-000000000000',
        });
        // Otro DT no puede usar el borrador de un compañero.
        const foreign = await send(otherDt.id, { reportDraftId: draftId });

        assert.equal(unknown.status, 409);
        assert.equal(foreign.status, 409);
    });

    it('si cambian los destinatarios tras generar, hay que volver a generar: 409', async () => {
        const draft = await generate(dt.id, registrationIds);
        const draftId = draft.headers.get('x-report-draft-id');

        const res = await send(dt.id, {
            reportDraftId: draftId,
            recipientRegistrationIds: [registrationIds[0]],
        });

        assert.equal(res.status, 409);
        assert.match(res.body.error, /destinatarios han cambiado/);
    });

    it('con borrador válido pasa la validación del acta (falla después por falta de SMTP)', async () => {
        const draft = await generate(dt.id, registrationIds);
        const res = await send(dt.id, {
            reportDraftId: draft.headers.get('x-report-draft-id'),
        });

        // La configuración de correo no existe en la base de pruebas: lo que
        // importa es que ya no falla por el borrador.
        assert.equal(res.status, 409);
        assert.match(res.body.error, /SMTP/);
    });

    it('la convocatoria no necesita borrador de acta', async () => {
        const res = await send(dt.id, { slot: 'convocatoria' });

        // Llega hasta la comprobación del SMTP: no se pidió ningún borrador.
        assert.equal(res.status, 409);
        assert.match(res.body.error, /SMTP/);
    });
});
