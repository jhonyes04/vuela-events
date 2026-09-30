import type { ReactNode } from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import {
    AlignCenter,
    AlignJustify,
    AlignLeft,
    AlignRight,
    Bold,
    Heading2,
    Heading3,
    Italic,
    Link as LinkIcon,
    List,
    ListOrdered,
    Strikethrough,
    Underline as UnderlineIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IconTooltip } from '@/components/IconTooltip';
import { cn } from '@/lib/utils';

interface ToolbarButtonProps {
    label: string;
    active: boolean;
    disabled?: boolean;
    onClick: () => void;
    children: ReactNode;
}

const ToolbarButton = ({
    label,
    active,
    disabled,
    onClick,
    children,
}: ToolbarButtonProps) => (
    <IconTooltip label={label}>
        <Button
            type="button"
            variant={active ? 'secondary' : 'ghost'}
            size="icon-sm"
            aria-label={label}
            aria-pressed={active}
            disabled={disabled}
            onClick={onClick}
        >
            {children}
        </Button>
    </IconTooltip>
);

const Divider = () => <div className="mx-0.5 w-px self-stretch bg-border" />;

const setLink = (editor: Editor) => {
    const previousUrl = editor.getAttributes('link').href as
        | string
        | undefined;
    const url = window.prompt('URL del enlace', previousUrl ?? '');

    if (url === null) return;

    if (url === '') {
        editor.chain().focus().extendMarkRange('link').unsetLink().run();
        return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
};

interface ToolbarProps {
    editor: Editor;
}

const Toolbar = ({ editor }: ToolbarProps) => (
    <div
        role="toolbar"
        aria-label="Formato de texto"
        className="flex flex-wrap items-center gap-0.5 rounded-t-lg border border-b-0 border-input bg-muted/50 p-1"
    >
        <ToolbarButton
            label="Título grande"
            active={editor.isActive('heading', { level: 2 })}
            onClick={() =>
                editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
        >
            <Heading2 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
            label="Título pequeño"
            active={editor.isActive('heading', { level: 3 })}
            onClick={() =>
                editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
        >
            <Heading3 className="size-4" />
        </ToolbarButton>

        <Divider />

        <ToolbarButton
            label="Negrita"
            active={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
        >
            <Bold className="size-4" />
        </ToolbarButton>
        <ToolbarButton
            label="Cursiva"
            active={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
        >
            <Italic className="size-4" />
        </ToolbarButton>
        <ToolbarButton
            label="Subrayado"
            active={editor.isActive('underline')}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
            <UnderlineIcon className="size-4" />
        </ToolbarButton>
        <ToolbarButton
            label="Tachado"
            active={editor.isActive('strike')}
            onClick={() => editor.chain().focus().toggleStrike().run()}
        >
            <Strikethrough className="size-4" />
        </ToolbarButton>

        <Divider />

        <ToolbarButton
            label="Lista con viñetas"
            active={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
            <List className="size-4" />
        </ToolbarButton>
        <ToolbarButton
            label="Lista numerada"
            active={editor.isActive('orderedList')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
            <ListOrdered className="size-4" />
        </ToolbarButton>

        <Divider />

        <ToolbarButton
            label="Alinear a la izquierda"
            active={editor.isActive({ textAlign: 'left' })}
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
        >
            <AlignLeft className="size-4" />
        </ToolbarButton>
        <ToolbarButton
            label="Centrar"
            active={editor.isActive({ textAlign: 'center' })}
            onClick={() =>
                editor.chain().focus().setTextAlign('center').run()
            }
        >
            <AlignCenter className="size-4" />
        </ToolbarButton>
        <ToolbarButton
            label="Alinear a la derecha"
            active={editor.isActive({ textAlign: 'right' })}
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
        >
            <AlignRight className="size-4" />
        </ToolbarButton>
        <ToolbarButton
            label="Justificar"
            active={editor.isActive({ textAlign: 'justify' })}
            onClick={() =>
                editor.chain().focus().setTextAlign('justify').run()
            }
        >
            <AlignJustify className="size-4" />
        </ToolbarButton>

        <Divider />

        <ToolbarButton
            label="Enlace"
            active={editor.isActive('link')}
            onClick={() => setLink(editor)}
        >
            <LinkIcon className="size-4" />
        </ToolbarButton>
    </div>
);

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
const PlaceholderPalette = ({
    editor,
    placeholders,
}: PlaceholderPaletteProps) => (
    <div className="flex flex-wrap items-center gap-1.5 rounded-b-lg border border-t-0 border-input bg-muted/50 p-2">
        <span className="text-xs font-medium text-muted-foreground">
            Arrastra o haz clic para insertar:
        </span>
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
);

interface RichTextEditorProps {
    value: string;
    onChange: (html: string) => void;
    className?: string;
    // Chips de inserción rápida (arrastrar o clic) para tokens dinámicos.
    placeholders?: EditorPlaceholder[];
}

// Editor de texto enriquecido reutilizable; el valor entra y sale como HTML.
export const RichTextEditor = ({
    value,
    onChange,
    className,
    placeholders,
}: RichTextEditorProps) => {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({ heading: { levels: [2, 3] } }),
            Underline,
            Link.configure({ openOnClick: false, autolink: true }),
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
        ],
        content: value,
        onUpdate: ({ editor }) => onChange(editor.getHTML()),
    });

    if (!editor) return null;

    const hasPlaceholders = placeholders && placeholders.length > 0;

    return (
        <div className={cn('grid', className)}>
            <Toolbar editor={editor} />
            <EditorContent
                editor={editor}
                className={cn(
                    'min-h-32 border border-input bg-transparent px-3 py-2 text-sm outline-none',
                    hasPlaceholders ? 'border-b-0' : 'rounded-b-lg',
                    'focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50',
                    '[&_.tiptap]:outline-none',
                    '[&_h2]:text-lg [&_h2]:font-semibold',
                    '[&_h3]:text-base [&_h3]:font-semibold',
                    '[&_ul]:list-disc [&_ul]:pl-5',
                    '[&_ol]:list-decimal [&_ol]:pl-5',
                    '[&_a]:text-primary [&_a]:underline',
                )}
            />
            {hasPlaceholders && (
                <PlaceholderPalette editor={editor} placeholders={placeholders} />
            )}
        </div>
    );
};
