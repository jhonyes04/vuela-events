import { prisma } from '../lib/prisma.js';
import { Prisma } from '../generated/prisma/client.js';

export type SessionFailure = 'not_found';

export class SessionError extends Error {
    readonly reason: SessionFailure;

    constructor(reason: SessionFailure) {
        super(reason);

        this.name = 'SessionError';
        this.reason = reason;
    }
}

export interface ActiveSession {
    sid: string;
    userId: string;
    userName: string;
    name: string;
    puntoVuela: string | null;
    userEmail: string;
    expire: Date;
    current: boolean;
}

// sess es el JSON de express-session
// El operador ->> de Postgres saca el campo como texto directamente del JSON
export const listActiveSessions = async (
    currentSid: string,
): Promise<ActiveSession[]> => {
    const rows = await prisma.$queryRaw<
        {
            sid: string;
            userId: string;
            name: string;
            lastName: string;
            puntoVuela: string | null;
            email: string;
            expire: Date;
        }[]
    >`
        SELECT
            s.sid,
            s.sess ->> 'userId' AS "userId",
            u.name,
            u."lastName",
            u."puntoVuela",
            u.email,
            s.expire
        FROM session s
        JOIN users u ON u.id = (s.sess ->> 'userId')::uuid
        WHERE s.expire > now() AND s.sess ->> 'userId' IS NOT NULL
        ORDER BY s.expire DESC
    `;

    return rows.map((row) => ({
        sid: row.sid,
        userId: row.userId,
        userName: `${row.name} ${row.lastName}`.trim(),
        name: row.name,
        puntoVuela: row.puntoVuela,
        userEmail: row.email,
        expire: row.expire,
        current: row.sid === currentSid,
    }));
};

export const revokeSession = async (sid: string): Promise<void> => {
    try {
        await prisma.session.delete({ where: { sid } });
    } catch (e) {
        if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === 'P2025'
        ) {
            throw new SessionError('not_found');
        }

        throw e;
    }
};

export interface OnlineUser {
    userId: string;
    name: string;
    lastName: string;
    avatarConfigured: boolean;
}

export const listOnlineUsers = async (): Promise<OnlineUser[]> => {
    const rows = await prisma.$queryRaw<
        {
            userId: string;
            name: string;
            lastName: string;
            avatarConfigured: boolean;
        }[]
    >`
        SELECT DISTINCT ON (u.id)
            u.id AS "userId",
            u.name,
            u."lastName",
            (u."avatarImage" IS NOT NULL) AS "avatarConfigured"
        FROM session s
        JOIN users u ON u.id = (s.sess ->> 'userId')::uuid
        WHERE s.expire > now() AND s.sess ->> 'userId' IS NOT NULL
            AND u."roleId" != 'admin'
    `;

    return rows;
};
