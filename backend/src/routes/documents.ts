import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import {
    MAX_DOCUMENT_BYTES,
    matchesDocumentType,
    documentContentTypeSchema,
} from '../lib/documentValidation.js';
import {
    DocumentManageError,
    createDocument,
    deleteDocument,
    getDocumentFile,
    listDocuments,
    updateDocument,
} from '../services/documents.js';

const idParamsSchema = z.object({ id: z.uuid() });

const createDocumentSchema = z.strictObject({
    title: z.string().trim().min(2).max(100),
    fileName: z.string().trim().min(1).max(255),
    contentType: documentContentTypeSchema,
    dataBase64: z.string().min(1),
});

const updateDocumentSchema = z.strictObject({
    title: z.string().trim().min(2).max(100),
    active: z.boolean(),
    fileName: z.string().trim().min(1).max(255).optional(),
    contentType: documentContentTypeSchema.optional(),
    dataBase64: z.string().min(1).optional(),
});

const documentManageErrors = {
    duplicate: [409, 'Ya existe un documento con ese título'],
    not_found: [404, 'Documento no encontrado'],
    forbidden: [403, 'No puedes gestionar un documento que no creaste'],
    has_projects: [
        409,
        'No se puede eliminar: hay proyectos con este documento',
    ],
} as const;

// Decodifica y valida el archivo (tamaño + firma de bytes); null si no venía ninguno.
const decodeDocumentFile = (
    contentType: string | undefined,
    dataBase64: string | undefined,
): Buffer | null | 'invalid' => {
    if (contentType === undefined && dataBase64 === undefined) return null;
    if (contentType === undefined || dataBase64 === undefined) return 'invalid';

    let data: Buffer;

    try {
        data = Buffer.from(dataBase64, 'base64');
    } catch {
        return 'invalid';
    }

    if (
        data.length === 0 ||
        data.length > MAX_DOCUMENT_BYTES ||
        !matchesDocumentType(data, contentType)
    ) {
        return 'invalid';
    }

    return data;
};

export const documentRouter = Router();

documentRouter.use(requireAuth);

documentRouter.get(
    '/',
    requirePermission(
        'resources:view',
        'resources:create',
        'resources:edit',
        'resources:edit:own',
        'resources:delete',
        'resources:delete:own',
    ),
    async (_req, res) => {
        const documents = await listDocuments();
        res.json({ documents });
    },
);

documentRouter.post(
    '/',
    requirePermission('resources:create'),
    async (req, res) => {
        const actor = req.user;
        if (!actor) {
            res.status(401).json({ error: 'Autenticación requerida' });
            return;
        }

        const body = createDocumentSchema.safeParse(req.body);
        if (!body.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        const data = decodeDocumentFile(
            body.data.contentType,
            body.data.dataBase64,
        );

        if (data === null || data === 'invalid') {
            res.status(400).json({
                error: 'El archivo debe ser PDF, Word, Excel u OpenDocument (.odt/.ods/.odp) de menos de 10MB',
            });
            return;
        }

        try {
            const doc = await createDocument(
                actor.id,
                body.data.title,
                body.data.fileName,
                body.data.contentType,
                data,
            );
            res.status(201).json({ document: doc });
        } catch (e) {
            if (e instanceof DocumentManageError) {
                const [status, error] = documentManageErrors[e.reason];
                res.status(status).json({ error });
                return;
            }
            throw e;
        }
    },
);

documentRouter.patch(
    '/:id',
    requirePermission('resources:edit', 'resources:edit:own'),
    async (req, res) => {
        const actor = req.user;
        if (!actor) {
            res.status(401).json({ error: 'Autenticación requerida' });
            return;
        }

        const params = idParamsSchema.safeParse(req.params);
        const body = updateDocumentSchema.safeParse(req.body);
        if (!params.success || !body.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        const data = decodeDocumentFile(
            body.data.contentType,
            body.data.dataBase64,
        );

        if (data === 'invalid') {
            res.status(400).json({
                error: 'El archivo debe ser PDF, Word, Excel u OpenDocument (.odt/.ods/.odp) de menos de 10MB',
            });
            return;
        }

        try {
            const doc = await updateDocument(actor, params.data.id, {
                title: body.data.title,
                active: body.data.active,
                ...(data && {
                    file: {
                        // fileName/contentType van garantizados si data no es null (ver decodeDocumentFile).
                        fileName: body.data.fileName!,
                        contentType: body.data.contentType!,
                        data,
                    },
                }),
            });
            res.json({ document: doc });
        } catch (e) {
            if (e instanceof DocumentManageError) {
                const [status, error] = documentManageErrors[e.reason];
                res.status(status).json({ error });
                return;
            }
            throw e;
        }
    },
);

documentRouter.delete(
    '/:id',
    requirePermission('resources:delete', 'resources:delete:own'),
    async (req, res) => {
        const actor = req.user;
        if (!actor) {
            res.status(401).json({ error: 'Autenticación requerida' });
            return;
        }

        const params = idParamsSchema.safeParse(req.params);
        if (!params.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        try {
            await deleteDocument(actor, params.data.id);
            res.status(204).end();
        } catch (e) {
            if (e instanceof DocumentManageError) {
                const [status, error] = documentManageErrors[e.reason];
                res.status(status).json({ error });
                return;
            }
            throw e;
        }
    },
);

documentRouter.get(
    '/:id/download',
    requirePermission(
        'resources:view',
        'resources:create',
        'resources:edit',
        'resources:edit:own',
        'resources:delete',
        'resources:delete:own',
    ),
    async (req, res) => {
        const params = idParamsSchema.safeParse(req.params);
        if (!params.success) {
            res.status(400).json({ error: 'Solicitud no válida' });
            return;
        }

        const doc = await getDocumentFile(params.data.id);
        if (!doc) {
            res.status(404).json({ error: 'Documento no encontrado' });
            return;
        }

        res.setHeader('Content-Type', doc.contentType);
        res.setHeader(
            'Content-Disposition',
            "attachment; filename*=UTF-8''" + encodeURIComponent(doc.fileName),
        );
        res.send(Buffer.from(doc.data));
    },
);
