// Texto plano de un HTML para vistas previas en listas
export const stripHtml = (html: string): string =>
    new DOMParser()
        .parseFromString(html, 'text/html')
        .body.textContent?.trim() ?? '';

export const extractLockedSection = (
    html: string,
    heading: string,
): string | null => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const headings = Array.from(doc.querySelectorAll('[data-locked-heading]'));
    const normalize = (text: string) =>
        text.trim().toLowerCase().replace(/:\s*$/, '');
    const target = headings.find(
        (h) => normalize(h.textContent ?? '') === normalize(heading),
    );

    if (!target) return null;

    const parts: string[] = [];

    let node = target.nextElementSibling;

    while (node && !node.hasAttribute('data-locked-heading')) {
        const text = node.textContent?.trim();

        if (text) parts.push(text);

        node = node.nextElementSibling;
    }

    return parts.join(' ').trim() || null;
};
