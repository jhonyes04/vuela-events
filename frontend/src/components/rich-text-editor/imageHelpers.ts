import { config } from '@/config';

export const MIN_IMAGE_WIDTH = 40;

// Las imágenes propias se guardan con ruta relativa (/api/...). En producción la API
// está en otro dominio, así que el editor las pide a config.apiBase.
export const resolveImageSrc = (src: string): string =>
    src.startsWith('/api/')
        ? `${config.apiBase.replace(/\/api$/, '')}${src}`
        : src;

// Al pegar, el tamaño del HTML de origen (suele ser pequeño) no se conserva:
// la imagen toma su tamaño natural. El contenido ya guardado sí conserva su tamaño.
export const stripPastedImageSize = (html: string): string => {
    const doc = new DOMParser().parseFromString(html, 'text/html');

    doc.querySelectorAll('img').forEach((img) => {
        img.removeAttribute('width');
        img.removeAttribute('height');
    });

    return doc.body.innerHTML;
};

// Ancho natural de una imagen (null si no carga). No usa Image: en este archivo
// Image es la extensión de Tiptap.
export const loadNaturalWidth = (src: string): Promise<number | null> =>
    new Promise((resolve) => {
        const img = document.createElement('img');

        img.onload = () => resolve(img.naturalWidth);
        img.onerror = () => resolve(null);
        img.src = src;
    });
