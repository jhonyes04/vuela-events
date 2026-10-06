import sanitizeHtml from 'sanitize-html';
import { prisma } from '../lib/prisma.js';
import { recordAudit } from './audit.js';

const IMAGE_URL_PREFIX = '/api/profile/email-signature-images/';
const IMAGE_SRC_RE = new RegExp(`^${IMAGE_URL_PREFIX}([0-9a-f-]{36})$`);
const IMAGE_SRC_RE_GLOBAL = new RegExp(
    `${IMAGE_URL_PREFIX}([0-9a-f-]{36})`,
    'g',
);

// Solo lo imprescindible para una firma: nada de scripts, iframes ni estilos libres.
const sanitizeOptions: sanitizeHtml.IOptions = {
    allowedTags: [
        'p',
        'br',
        'strong',
        'em',
        'u',
        's',
        'h2',
        'h3',
        'ul',
        'ol',
        'li',
        'a',
        'img',
        'span',
    ],
    allowedAttributes: {
        a: ['href'],
        img: ['src', 'alt', 'width', 'height'],
        '*': ['style'],
    },
    allowedStyles: {
        '*': {
            'text-align': [/^(left|center|right|justify)$/],
            'font-size': [/^(10|12|14|16|18|24|32)px$/],
        },
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    // Una <img> que no apunte a una imagen propia ya subida se descarta entera.
    exclusiveFilter: (frame) =>
        frame.tag === 'img' && !IMAGE_SRC_RE.test(frame.attribs['src'] ?? ''),
};

const referencedImageIds = (html: string): string[] =>
    [...html.matchAll(IMAGE_SRC_RE_GLOBAL)].map((m) => m[1]!);

export const getEmailSignature = async (userId: string): Promise<string> => {
    const row = await prisma.user.findUnique({
        where: { id: userId },
        select: { emailSignature: true },
    });

    return row?.emailSignature ?? '';
};

// Devuelve el HTML ya saneado (lo que realmente quedó guardado).
export const saveEmailSignature = async (
    userId: string,
    rawHtml: string,
): Promise<string> => {
    const html = sanitizeHtml(rawHtml, sanitizeOptions);
    const keepIds = referencedImageIds(html);

    await prisma.$transaction(async (tx) => {
        await tx.user.update({
            where: { id: userId },
            data: { emailSignature: html || null },
        });

        // Las imágenes propias que ya no se usan en la firma se eliminan.
        await tx.emailSignatureImage.deleteMany({
            where: {
                userId,
                ...(keepIds.length > 0 ? { id: { notIn: keepIds } } : {}),
            },
        });

        await tx.auditLog.create({
            data: { actorId: userId, action: 'email_signature_updated' },
        });
    });

    return html;
};

export const addEmailSignatureImage = async (
    userId: string,
    contentType: string,
    data: Buffer,
): Promise<string> => {
    const image = await prisma.emailSignatureImage.create({
        data: { userId, contentType, data: new Uint8Array(data) },
        select: { id: true },
    });

    await recordAudit({
        action: 'email_signature_image_added',
        actorId: userId,
    });

    return image.id;
};

export const getEmailSignatureImage = async (
    userId: string,
    imageId: string,
): Promise<{ contentType: string; data: Buffer } | null> => {
    const row = await prisma.emailSignatureImage.findFirst({
        where: { id: imageId, userId },
        select: { contentType: true, data: true },
    });

    return row
        ? { contentType: row.contentType, data: Buffer.from(row.data) }
        : null;
};

export interface SignatureInlineImage {
    cid: string;
    contentType: string;
    content: Buffer;
}

export interface SignatureForSend {
    html: string;
    inlineImages: SignatureInlineImage[];
}

// Firma lista para un correo: las <img> pasan a cid: y sus bytes viajan como adjuntos inline.
export const getEmailSignatureForSend = async (
    userId: string,
): Promise<SignatureForSend | null> => {
    const html = await getEmailSignature(userId);

    if (!html) return null;

    const ids = [...new Set(referencedImageIds(html))];
    const rows =
        ids.length > 0
            ? await prisma.emailSignatureImage.findMany({
                  where: { userId, id: { in: ids } },
                  select: { id: true, contentType: true, data: true },
              })
            : [];

    const available = new Set(rows.map((row) => row.id));

    const cidHtml = html.replace(IMAGE_SRC_RE_GLOBAL, (_match, id: string) =>
        available.has(id) ? `cid:${id}` : '',
    );

    const inlineImages = rows.map((row) => ({
        cid: row.id,
        contentType: row.contentType,
        content: Buffer.from(row.data),
    }));

    return { html: cidHtml, inlineImages };
};
