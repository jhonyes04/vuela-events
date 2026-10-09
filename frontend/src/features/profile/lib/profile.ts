import { api, type User } from '@/lib/api';
import { ROLE_IDS } from '@/features/users/lib/roles';

// Deben coincidir con los límites del servidor (que es quien manda).
export const NAME_MAX = 200;
export const PUNTO_VUELA_MAX = 120;
export const MIN_LENGTH = 2;

export interface PuntoVueloHints {
    label: string;
    placeholder: string;
    help: string | null;
}

// El DT no pertenece a un Punto Vuela concreto: indica su zona.
export const puntoVueloHints = (roleId: string): PuntoVueloHints =>
    roleId === ROLE_IDS.AIL
        ? {
              label: 'Punto Vuela',
              placeholder: 'Localidad de Punto Vuela',
              help: null,
          }
        : {
              label: 'Rol y zona',
              placeholder: 'Zona o ámbito de trabajo',
              help: 'Indica tu rol y zona de trabajo; no hace falta un Punto Vuela concreto',
          };

export type DinamizadorTitle = 'dinamizador' | 'dinamizadora';

export const DINAMIZADOR_OPTIONS: { value: DinamizadorTitle; label: string }[] = [
    { value: 'dinamizador', label: 'Dinamizador' },
    { value: 'dinamizadora', label: 'Dinamizadora' },
];

export interface ProfileValues {
    name: string;
    lastName: string;
    puntoVuela: string;
    dinamizadorTitle: DinamizadorTitle | null;
}

// Igual que el servidor: recorta y colapsa los espacios internos.
export const cleanText = (value: string): string =>
    value.trim().replace(/\s+/g, ' ');

export interface CategoryOption {
    id: string;
    name: string;
    color: string;
}

export const listCategoryOptions = async (): Promise<CategoryOption[]> => {
    const { categories } = await api.get<{ categories: CategoryOption[] }>(
        '/profile/category-options',
    );

    return categories;
};

export const getCategoryPreferences = async (): Promise<CategoryOption[]> => {
    const { categories } = await api.get<{ categories: CategoryOption[] }>(
        '/profile/category-preferences',
    );

    return categories;
};

export const setCategoryPreferences = async (
    categoryIds: string[],
): Promise<CategoryOption[]> => {
    const { categories } = await api.patch<{ categories: CategoryOption[] }>(
        '/profile/category-preferences',
        { categoryIds },
    );

    return categories;
};

export const updateProfile = async (values: ProfileValues): Promise<User> => {
    const { user } = await api.patch<{ user: User }>('/profile', values);

    return user;
};

export const setAppPassword = async (password: string): Promise<boolean> => {
    const { configured } = await api.patch<{ configured: boolean }>(
        '/profile/smtp-app-password',
        { password },
    );

    return configured;
};

export const clearAppPassword = async (): Promise<boolean> => {
    const { configured } = await api.delete<{ configured: boolean }>(
        '/profile/smtp-app-password',
    );

    return configured;
};

export const setSignatureImage = async (
    imageBase64: string,
): Promise<boolean> => {
    const { configured } = await api.patch<{ configured: boolean }>(
        '/profile/signature',
        { imageBase64 },
    );

    return configured;
};

export const clearSignatureImage = async (): Promise<boolean> => {
    const { configured } = await api.delete<{ configured: boolean }>(
        '/profile/signature',
    );

    return configured;
};

export const getEmailSignature = async (): Promise<string> => {
    const { html } = await api.get<{ html: string }>(
        '/profile/email-signature',
    );

    return html;
};

export const saveEmailSignature = async (html: string): Promise<string> => {
    const saved = await api.patch<{ html: string }>(
        '/profile/email-signature',
        { html },
    );

    return saved.html;
};

const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
            const result = reader.result as string;

            resolve(result.slice(result.indexOf(',') + 1));
        };

        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });

// Devuelve la URL de la imagen
export const uploadEmailSignatureImage = async (
    file: File,
): Promise<string> => {
    const dataBase64 = await fileToBase64(file);
    const { url } = await api.post<{ id: string; url: string }>(
        '/profile/email-signature/images',
        { contentType: file.type, dataBase64 },
    );

    return url;
};

// Deben coincidir con los límites del servidor (que es quien manda).
export const SIGNATURE_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
export const SIGNATURE_IMAGE_MAX_BYTES = 300 * 1024;

const SIGNATURE_IMAGE_PATH = '/api/profile/email-signature-images/';
// Ancho máximo de una imagen pegada (sin tamaño propio) al guardarla.
const PASTED_IMAGE_MAX_WIDTH = 600;

// Descarga una imagen pegada (data: o URL remota). Null si no es válida o no se puede leer.
const fetchAsImageFile = async (src: string): Promise<File | null> => {
    try {
        const res = await fetch(src);

        if (!res.ok) return null;

        const blob = await res.blob();

        if (
            !SIGNATURE_IMAGE_TYPES.includes(blob.type) ||
            blob.size > SIGNATURE_IMAGE_MAX_BYTES
        ) {
            return null;
        }

        return new File([blob], 'firma', { type: blob.type });
    } catch {
        return null;
    }
};

export interface ResolvedSignature {
    html: string;
    skipped: number;
}

// Antes de guardar: sube las imágenes que no son propias (pegadas) y las sustituye
// por su ruta del servidor. Las que no se pueden subir se quitan y se cuentan.
export const resolveSignatureImages = async (
    html: string,
): Promise<ResolvedSignature> => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    let skipped = 0;

    for (const img of [...doc.querySelectorAll('img')]) {
        const src = img.getAttribute('src') ?? '';

        if (src.startsWith(SIGNATURE_IMAGE_PATH)) continue;

        const file = await fetchAsImageFile(src);

        if (!file) {
            img.remove();
            skipped++;
            continue;
        }

        try {
            img.setAttribute('src', await uploadEmailSignatureImage(file));
        } catch {
            img.remove();
            skipped++;
            continue;
        }

        if (!img.hasAttribute('width')) {
            const bitmap = await createImageBitmap(file);

            img.setAttribute(
                'width',
                String(Math.min(bitmap.width, PASTED_IMAGE_MAX_WIDTH)),
            );
            bitmap.close();
        }
    }

    return { html: doc.body.innerHTML, skipped };
};
