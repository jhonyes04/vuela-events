import { after, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../lib/prisma.js';
import { recordAudit } from '../services/audit.js';
import { closeDb, createUser, resetDb } from './helpers.js';

describe('auditoría de accesos', () => {
    beforeEach(resetDb);

    after(closeDb);

    it('registra un login correcto con su actor', async () => {
        const user = await createUser('ail');

        await recordAudit({ action: 'login_success', actorId: user.id });

        const log = await prisma.auditLog.findFirstOrThrow();

        assert.equal(log.action, 'login_success');
        assert.equal(log.actorId, user.id);
    });

    it('registra un login rechazado con el motivo y sin actor', async () => {
        await recordAudit({
            action: 'login_rejected',
            newValue: 'domain_not_allowed',
        });

        const log = await prisma.auditLog.findFirstOrThrow();

        assert.equal(log.action, 'login_rejected');
        assert.equal(log.newValue, 'domain_not_allowed');
        assert.equal(log.actorId, null);
    });

    it('falla abierta: un error al escribir no lanza excepción', async () => {
        // actorId inexistente: la clave foránea rechaza la fila.
        await assert.doesNotReject(
            recordAudit({
                action: 'login_success',
                actorId: '11111111-1111-4111-8111-111111111111',
            }),
        );
        assert.equal(await prisma.auditLog.count(), 0);
    });
});
