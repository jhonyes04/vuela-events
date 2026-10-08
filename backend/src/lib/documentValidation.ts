export const ALLOWED_DOCUMENT_TYPES = {
    'application/pdf': 'PDF',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        'Word',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        'Excel',
    'application/vnd.oasis.opendocument.text': 'OpenDocument Text (.odt)',
    'application/vnd.oasis.opendocument.spreadsheet':
        'OpenDocument Spreadsheet (.ods)',
    'application/vnd.oasis.opendocument.presentation':
        'OpenDocument Presentation (.odp)',
} as const;

export type AllowedDocumentType = keyof typeof ALLOWED_DOCUMENT_TYPES;

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

const PDF_SIGNATURE = Buffer.from('%PDF-', 'ascii');
// .docx/.xlsx (OOXML) y .odt/.ods/.odp (OpenDocument) son todos ZIP: la firma
// solo confirma que es un ZIP válido, no distingue el formato exacto a nivel
// de bytes (haría falta mirar dentro del zip).
const ZIP_SIGNATURE = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

const ZIP_BASED_TYPES = new Set<string>([
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.oasis.opendocument.text',
    'application/vnd.oasis.opendocument.spreadsheet',
    'application/vnd.oasis.opendocument.presentation',
]);

export const matchesDocumentType = (
    buf: Buffer,
    contentType: string,
): boolean => {
    if (contentType === 'application/pdf') {
        return buf.subarray(0, 5).equals(PDF_SIGNATURE);
    }

    if (ZIP_BASED_TYPES.has(contentType)) {
        return buf.subarray(0, 4).equals(ZIP_SIGNATURE);
    }

    return false;
};
