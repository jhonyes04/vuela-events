import { prisma } from '../lib/prisma.js';
import { recordAudit } from './audit.js';

export type DocumentManageFailure = 'duplicate' | 'not_found';

export class DocumentManageError extends Error {
    readonly reason: DocumentManageFailure;
    constructor(reason: DocumentManageFailure) {
        super(reason);
        this.name = 'DocumentManageError';
        this.reason = reason;
    }
}

const documentListSelect = {
    id: true,
    title: true,
    fileName: true,
    contentType: true,
    size: true,
    active: true,
} as const;

export const listDocuments = () =>
    prisma.document.findMany({
        orderBy: { title: 'asc' },
        select: documentListSelect,
    });

export const createDocument = async (
    actorId: string,
    title: string,
    fileName: string,
    contentType: string,
    data: Buffer,
) => {
    const exists = await prisma.document.findUnique({ where: { title } });
    if (exists) throw new DocumentManageError('duplicate');

    const doc = await prisma.document.create({
        data: {
            title,
            fileName,
            contentType,
            size: data.length,
            data: new Uint8Array(data),
        },
        select: documentListSelect,
    });
    await recordAudit({
        action: 'document_created',
        actorId,
        newValue: doc.title.slice(0, 100),
    });
    return doc;
};

export const updateDocument = async (
    actorId: string,
    id: string,
    input: {
        title: string;
        active: boolean;
        file?: { fileName: string; contentType: string; data: Buffer };
    },
) => {
    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) throw new DocumentManageError('not_found');

    if (input.title !== doc.title) {
        const clash = await prisma.document.findUnique({
            where: { title: input.title },
        });
        if (clash) throw new DocumentManageError('duplicate');
    }

    const updated = await prisma.document.update({
        where: { id },
        data: {
            title: input.title,
            active: input.active,
            ...(input.file && {
                fileName: input.file.fileName,
                contentType: input.file.contentType,
                size: input.file.data.length,
                data: new Uint8Array(input.file.data),
            }),
        },
        select: documentListSelect,
    });
    await recordAudit({
        action: 'document_updated',
        actorId,
        oldValue: doc.title.slice(0, 100),
        newValue: updated.title.slice(0, 100),
    });
    return updated;
};

export const deleteDocument = async (actorId: string, id: string) => {
    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) throw new DocumentManageError('not_found');

    await prisma.document.delete({ where: { id } });
    await recordAudit({
        action: 'document_deleted',
        actorId,
        oldValue: doc.title.slice(0, 100),
    });
};

export const getDocumentFile = (id: string) =>
    prisma.document.findUnique({
        where: { id },
        select: { fileName: true, contentType: true, data: true },
    });
