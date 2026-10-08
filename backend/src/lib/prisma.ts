import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { env, isProd } from '../config/env.js';

const adapter = new PrismaPg({
    connectionString: env.DATABASE_URL,
    max: 10,
    keepAlive: true,
    idleTimeoutMillis: 30_000,
});

export const prisma = new PrismaClient({
    adapter,
    log: isProd ? ['error'] : ['warn', 'error'],
});
