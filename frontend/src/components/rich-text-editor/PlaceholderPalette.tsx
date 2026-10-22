import type { Editor } from '@tiptap/react';

export interface EditorPlaceholder {
    // Token literal que se inserta, p. ej. '{{fecha}}'.
    token: string;
    label: string;
}

interface PlaceholderPaletteProps {
    editor: Editor;
    placeholders: EditorPlaceholder[];
}

// Arrastrables (ProseMirror acepta texto plano soltado de forma nativa) y,
// como alternativa accesible/táctil, también se insertan con un clic.
export const PlaceholderPalette = ({
    editor,
    placeholders,
}: PlaceholderPaletteProps) => (
    <div className="rounded-b-lg border border-t-0 border-input bg-green-900/75 p-2 text-center">
        <span className="font-medium text-white">
            Arrastra o haz clic para insertar:
        </span>
        <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2">
            {placeholders.map(({ token, label }) => (
                <button
                    key={token}
                    type="button"
                    draggable
                    onDragStart={(e) =>
                        e.dataTransfer.setData('text/plain', token)
                    }
                    onClick={() =>
                        editor.chain().focus().insertContent(token).run()
                    }
                    className="cursor-grab rounded-full border border-border bg-background px-2 py-0.5 text-xs font-medium hover:bg-muted active:cursor-grabbing"
                >
                    {label}
                </button>
            ))}
        </div>
    </div>
);
