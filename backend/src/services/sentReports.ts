import { prisma } from '../lib/prisma.js';

interface SaveInput {
    eventId: string;
    senderId: string;
    filename: string;
    pdf: Buffer;
    recipientUserIds: string[];
}

export const saveSentReport = async (input: SaveInput): Promise<void> => {
    await prisma.sentReport.create({
        data: {
            eventId: input.eventId,
            senderId: input.senderId,
            filename: input.filename,
            pdf: new Uint8Array(input.pdf),
            recipientUserIds: input.recipientUserIds,
        },
    });
};

// Solo ve el acta quien la envió o quien la recibió.
const visibleTo = (userId: string) => ({
    OR: [{ senderId: userId }, { recipientUserIds: { has: userId } }],
});

export const listSentReports = async (userId: string, query?: string) => {
    const rows = await prisma.sentReport.findMany({
        where: {
            ...visibleTo(userId),
            ...(query && {
                event: { title: { contains: query, mode: 'insensitive' } },
            }),
        },
        select: {
            id: true,
            filename: true,
            createdAt: true,
            senderId: true,
            sender: { select: { name: true, puntoVuela: true } },
            event: {
                select: {
                    id: true,
                    title: true,
                    startsAt: true,
                    endsAt: true,
                    location: true,
                    project: { select: { id: true, name: true, color: true } },
                },
            },
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
    });

    return rows.map(({ senderId, ...row }) => ({
        ...row,
        sentByMe: senderId === userId,
    }));
};

export const getSentReportPdf = async (
    userId: string,
    id: string,
): Promise<{ filename: string; pdf: Buffer } | null> => {
    const row = await prisma.sentReport.findFirst({
        where: { id, ...visibleTo(userId) },
        select: { filename: true, pdf: true },
    });

    return row ? { filename: row.filename, pdf: Buffer.from(row.pdf) } : null;
};
