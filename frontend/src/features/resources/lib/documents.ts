import { api, downloadFile } from '@/lib/api';

export interface Document {
    id: string;
    title: string;
    fileName: string;
    contentType: string;
    size: number;
    active: boolean;
}

export interface DocumentCreateInput {
    title: string;
    fileName: string;
    contentType: string;
    dataBase64: string;
}

export interface DocumentUpdateInput {
    title: string;
    active: boolean;
    fileName?: string;
    contentType?: string;
    dataBase64?: string;
}

export const listDocuments = async (): Promise<Document[]> => {
    const { documents } = await api.get<{ documents: Document[] }>(
        '/documents',
    );
    return documents;
};

export const createDocument = async (
    input: DocumentCreateInput,
): Promise<Document> => {
    const { document } = await api.post<{ document: Document }>(
        '/documents',
        input,
    );
    return document;
};

export const updateDocument = async (
    id: string,
    input: DocumentUpdateInput,
): Promise<Document> => {
    const { document } = await api.patch<{ document: Document }>(
        `/documents/${id}`,
        input,
    );
    return document;
};

export const deleteDocument = async (id: string): Promise<void> =>
    api.delete(`/documents/${id}`);

export const downloadDocument = (id: string, fallbackName: string) =>
    downloadFile(`/documents/${id}/download`, fallbackName);

// Lee un File del input y lo separa en contentType + base64 puro (sin el prefijo data:...).
export const readFileAsBase64 = (
    file: File,
): Promise<{ contentType: string; dataBase64: string }> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
        reader.onload = () => {
            const result = reader.result as string;
            const comma = result.indexOf(',');
            resolve({
                contentType: file.type,
                dataBase64: result.slice(comma + 1),
            });
        };
        reader.readAsDataURL(file);
    });
