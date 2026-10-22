import { Node } from '@tiptap/react';
import { TextStyle } from '@tiptap/extension-text-style';
import Link from '@tiptap/extension-link';
import { Plugin, PluginKey } from '@tiptap/pm/state';

export const FONT_SIZES = ['10px', '12px', '14px', '16px', '18px', '24px', '32px'];

// Guarda el tamaño como style="font-size: …" en el span (el correo no admite clases).
export const FontSize = TextStyle.extend({
    addAttributes() {
        return {
            fontSize: {
                default: null,
                parseHTML: (el) => el.style.fontSize || null,
                renderHTML: (attrs) =>
                    attrs.fontSize
                        ? { style: `font-size: ${attrs.fontSize}` }
                        : {},
            },
        };
    },
});

// Estilo fijo para que un enlace se vea como botón; debe coincidir con lo que
// admite el saneador del backend (backend/src/services/emailSignature.ts).
export const BUTTON_LINK_STYLE =
    'background-color:#f4d64e;color:#242529;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;';

// Guarda el estilo de botón como style="…" en el <a> (igual que FontSize con el span).
export const LinkWithButton = Link.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            buttonStyle: {
                default: null,
                parseHTML: (el) =>
                    el.style.backgroundColor ? el.getAttribute('style') : null,
                renderHTML: (attrs) =>
                    attrs.buttonStyle ? { style: attrs.buttonStyle } : {},
            },
        };
    },
});

// Párrafo fijo no editable ni borrable
// El HTML persistido lleva data-locked-heading="true" para reconstruirse igual al recargar
export const LockedHeading = Node.create({
    name: 'lockedHeading',
    group: 'block',
    atom: true,
    selectable: true,
    draggable: false,
    content: '',

    addAttributes() {
        return {
            text: { default: '' },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'p[data-locked-heading]',
                // Por encima de la prioridad por defecto (50) de Paragraph:
                // su regla "tag: 'p'" sin atributo también matchearía este
                // párrafo y ganaría por registrarse antes en el schema.
                priority: 100,
                getAttrs: (el) => ({
                    text: (el as HTMLElement).textContent?.trim() ?? '',
                }),
            },
        ];
    },

    renderHTML({ node }) {
        return [
            'p',
            { 'data-locked-heading': 'true' },
            ['strong', {}, node.attrs.text as string],
        ];
    },

    addProseMirrorPlugins() {
        return [
            new Plugin({
                key: new PluginKey('lockedHeadingGuard'),
                filterTransaction: (tr, state) => {
                    if (!tr.docChanged) return true;

                    const count = (doc: typeof tr.doc) => {
                        let n = 0;
                        doc.descendants((node) => {
                            if (node.type.name === 'lockedHeading') n++;
                        });
                        return n;
                    };

                    return count(tr.doc) >= count(state.doc);
                },
            }),
        ];
    },
});
