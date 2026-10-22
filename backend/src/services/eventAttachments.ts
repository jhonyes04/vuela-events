import { prisma } from '../lib/prisma.js';

export const getEventAttachmentFile = (eventId: string, attachmentId: string) =>
    prisma.eventAttachment.findFirst({
        where: { id: attachmentId, eventId },
        select: { fileName: true, contentType: true, data: true },
    });
