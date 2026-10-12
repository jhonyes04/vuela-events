// Texto plano de un HTML para vistas previas en listas
export const stripHtml = (html: string): string =>
    new DOMParser()
        .parseFromString(html, 'text/html')
        .body.textContent?.trim() ?? '';
