// Texto plano de un HTML para vistas previas en listas
export const stripHtml = (html: string): string =>
    new DOMParser()
        .parseFromString(html, 'text/html')
        .body.textContent?.trim() ?? '';

// Texto plano con '\n' (ej. un Textarea) -> un <p> por línea, para
// precargarlo en un RichTextEditor sin que el HTML colapse los saltos.
export const textToHtml = (text: string): string => {
    const span = document.createElement('span');

    return text
        .split('\n')
        .map((line) => {
            span.textContent = line;

            return `<p>${span.innerHTML}</p>`;
        })
        .join('');
};

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

export const replaceLockedSection = (
    html: string,
    heading: string,
    replacement: string | string[],
): string => {
    const currentText = extractLockedSection(html, heading);

    if (
        currentText?.toLowerCase() ===
        'no es necesario en este tipo de eventos'
    ) {
        return html;
    }

    const doc = new DOMParser().parseFromString(html, 'text/html');
    const headings = Array.from(doc.querySelectorAll('[data-locked-heading]'));
    const normalize = (text: string) =>
        text.trim().toLowerCase().replace(/:\s*$/, '');
    const target = headings.find(
        (h) => normalize(h.textContent ?? '') === normalize(heading),
    );

    if (!target) return html;

    let node = target.nextElementSibling;

    while (node && !node.hasAttribute('data-locked-heading')) {
        const next = node.nextElementSibling;

        node.remove();
        node = next;
    }

    if (Array.isArray(replacement)) {
        const list = doc.createElement('ul');

        for (const item of replacement) {
            const li = doc.createElement('li');

            li.textContent = item;
            list.append(li);
        }

        target.after(list);
    } else {
        const paragraph = doc.createElement('p');

        paragraph.textContent = replacement;
        target.after(paragraph);
    }

    return doc.body.innerHTML;
};
