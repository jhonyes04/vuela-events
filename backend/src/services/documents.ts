import { prisma } from '../lib/prisma.js';
import { recordAudit } from './audit.js';
import { canManageResource } from '../lib/ownership.js';
import type { AuthUser } from '../lib/authUser.js';

export type DocumentManageFailure =
    | 'duplicate'
    | 'not_found'
    | 'forbidden'
    | 'has_projects';

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
    createdById: true,
    _count: { select: { projects: true } },
} as const;

const flattenDocument = <T extends { _count: { projects: number } }>({
    _count,
    ...rest
}: T) => ({ ...rest, inUse: _count.projects > 0 });

export const listDocuments = async () => {
    const documents = await prisma.document.findMany({
        orderBy: { title: 'asc' },
        select: documentListSelect,
    });

    return documents.map(flattenDocument);
};

export const createDocument = async (
    actorId: string,
    title: string,
    fileName: string,
    contentType: string,
    data: Buffer,
) => {
    const exists = await prisma.document.findUnique({ where: { title } });
    if (exists) throw new DocumentManageError('duplicate');

    const documents = await prisma.document.create({
        data: {
            title,
            fileName,
            contentType,
            size: data.length,
            data: new Uint8Array(data),
            createdById: actorId,
        },
        select: documentListSelect,
    });
    await recordAudit({
        action: 'document_created',
        actorId,
        newValue: documents.title.slice(0, 100),
    });
    return flattenDocument(documents);
};

export const updateDocument = async (
    actor: Pick<AuthUser, 'id' | 'permissions'>,
    id: string,
    input: {
        title: string;
        active: boolean;
        file?: { fileName: string; contentType: string; data: Buffer };
    },
) => {
    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) throw new DocumentManageError('not_found');

    if (
        !canManageResource(
            actor,
            doc.createdById,
            'resources:edit',
            'resources:edit:own',
        )
    ) {
        throw new DocumentManageError('forbidden');
    }

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
        actorId: actor.id,
        oldValue: doc.title.slice(0, 100),
        newValue: updated.title.slice(0, 100),
    });
    return flattenDocument(updated);
};

export const deleteDocument = async (
    actor: Pick<AuthUser, 'id' | 'permissions'>,
    id: string,
) => {
    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) throw new DocumentManageError('not_found');

    if (
        !canManageResource(
            actor,
            doc.createdById,
            'resources:delete',
            'resources:delete:own',
        )
    ) {
        throw new DocumentManageError('forbidden');
    }

    const projectsCount = await prisma.project.count({
        where: { documents: { some: { documentId: id } } },
    });

    if (projectsCount > 0) {
        throw new DocumentManageError('has_projects');
    }

    await prisma.document.delete({ where: { id } });
    await recordAudit({
        action: 'document_deleted',
        actorId: actor.id,
        oldValue: doc.title.slice(0, 100),
    });
};

export const getDocumentFile = (id: string) =>
    prisma.document.findUnique({
        where: { id },
        select: { fileName: true, contentType: true, data: true },
    });
