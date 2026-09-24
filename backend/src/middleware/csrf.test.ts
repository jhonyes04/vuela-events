import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';
import { requireSameOrigin } from './csrf.js';

const run = (method: string, origin: string | undefined) => {
    let status = 0;
    let nextCalls = 0;

    const req = {
        method,
        get: (name: string) => (name === 'Origin' ? origin : undefined),
    } as unknown as Request;

    const res = {
        status(code: number) {
            status = code;

            return this;
        },
        json() {
            return this;
        },
    } as unknown as Response;

    const next: NextFunction = () => {
        nextCalls += 1;
    };

    requireSameOrigin(req, res, next);

    return { status, nextCalls };
};

describe('requireSameOrigin', () => {
    it('POST sin Origin: responde 403 y NO continúa la cadena', () => {
        assert.deepEqual(run('POST', undefined), { status: 403, nextCalls: 0 });
    });

    it('POST con origen ajeno: responde 403 y NO continúa la cadena', () => {
        assert.deepEqual(run('POST', 'http://evil.example'), {
            status: 403,
            nextCalls: 0,
        });
    });

    it('POST con el origen correcto: continúa', () => {
        assert.deepEqual(run('POST', env.FRONTEND_ORIGIN), {
            status: 0,
            nextCalls: 1,
        });
    });

    it('GET sin Origin: continúa (método seguro)', () => {
        assert.deepEqual(run('GET', undefined), { status: 0, nextCalls: 1 });
    });
});
