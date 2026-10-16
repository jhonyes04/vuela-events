import {
    useEffect,
    useRef,
    useState,
    type FormEvent,
    type PointerEvent as ReactPointerEvent,
    type ReactNode,
} from 'react';
import {
    EditorContent,
    NodeViewWrapper,
    ReactNodeViewRenderer,
    useEditor,
    useEditorState,
    type Editor,
    type NodeViewProps,
} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Image from '@tiptap/extension-image';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import { scrollbarOptions } from '@/lib/overlayScrollbarsOptions';
import {
    AlignCenter,
    AlignJustify,
    AlignLeft,
    AlignRight,
    Bold,
    Heading2,
    Heading3,
    Image as ImageIcon,
    Italic,
    Link as LinkIcon,
    List,
    ListOrdered,
    Strikethrough,
    Underline as UnderlineIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { IconTooltip } from '@/components/IconTooltip';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { config } from '@/config';

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
            className="size-9 sm:size-7"
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

const isValidHttpUrl = (value: string): boolean => {
    try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
};

interface LinkDialogProps {
    open: boolean;
    initialValue: string;
    hasLink: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (url: string) => void;
    onRemove: () => void;
}

const LinkDialog = ({
    open,
    initialValue,
    hasLink,
    onOpenChange,
    onSubmit,
    onRemove,
}: LinkDialogProps) => {
    const [value, setValue] = useState(initialValue);
    const [touched, setTouched] = useState(false);

    useEffect(() => {
        if (open) {
            setValue(initialValue);
            setTouched(false);
        }
    }, [open, initialValue]);

    const isValid = isValidHttpUrl(value);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        setTouched(true);
        if (!isValid) return;
        onSubmit(value.trim());
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {open && (
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Insertar enlace</DialogTitle>
                    </DialogHeader>
                    <form
                        id="link-dialog-form"
                        onSubmit={handleSubmit}
                        className="grid gap-1.5"
                        noValidate
                    >
                        <Label htmlFor="link-dialog-url">URL</Label>
                        <Input
                            id="link-dialog-url"
                            type="url"
                            autoFocus
                            placeholder="https://…"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            onBlur={() => setTouched(true)}
                            aria-invalid={touched && !isValid}
                        />
                        {touched && !isValid && (
                            <p className="text-sm text-destructive">
                                Introduce una URL válida (http/https).
                            </p>
                        )}
                    </form>
                    <DialogFooter>
                        {hasLink && (
                            <Button
                                type="button"
                                variant="outline"
                                className="mr-auto"
                                onClick={onRemove}
                            >
                                Quitar enlace
                            </Button>
                        )}
                        <Button type="submit" form="link-dialog-form">
                            Insertar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            )}
        </Dialog>
    );
};

const FONT_SIZES = ['10px', '12px', '14px', '16px', '18px', '24px', '32px'];

// Guarda el tamaño como style="font-size: …" en el span (el correo no admite clases).
const FontSize = TextStyle.extend({
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

interface ToolbarState {
    bold: boolean;
    italic: boolean;
    underline: boolean;
    strike: boolean;
    heading2: boolean;
    heading3: boolean;
    bulletList: boolean;
    orderedList: boolean;
    alignLeft: boolean;
    alignCenter: boolean;
    alignRight: boolean;
    alignJustify: boolean;
    link: boolean;
    fontSize: string;
}

interface ToolbarProps {
    editor: Editor;
    state: ToolbarState;
    onLinkClick: () => void;
    onImageClick?: () => void;
}

const Toolbar = ({ editor, state, onLinkClick, onImageClick }: ToolbarProps) => (
    <div
        role="toolbar"
        aria-label="Formato de texto"
        className="flex min-w-0 max-w-full flex-wrap items-center gap-1 rounded-t-lg border border-b-0 border-input bg-muted/50 p-1 sm:gap-0.5"
    >
        <ToolbarButton
            label="Título grande"
            active={state.heading2}
            onClick={() =>
                editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
        >
            <Heading2 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
            label="Título pequeño"
            active={state.heading3}
            onClick={() =>
                editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
        >
            <Heading3 className="size-4" />
        </ToolbarButton>

        <select
            aria-label="Tamaño del texto"
            value={state.fontSize}
            onChange={(e) => {
                const size = e.target.value;

                if (size) {
                    editor
                        .chain()
                        .focus()
                        .setMark('textStyle', { fontSize: size })
                        .run();
                } else {
                    editor.chain().focus().unsetMark('textStyle').run();
                }
            }}
            className="h-9 rounded-md border border-input bg-background px-1.5 text-xs sm:h-8"
        >
            <option value="">Normal</option>
            {FONT_SIZES.map((size) => (
                <option key={size} value={size}>
                    {size}
                </option>
            ))}
        </select>

        <Divider />

        <ToolbarButton
            label="Negrita"
            active={state.bold}
            onClick={() => editor.chain().focus().toggleBold().run()}
        >
            <Bold className="size-4" />
        </ToolbarButton>
        <ToolbarButton
            label="Cursiva"
            active={state.italic}
            onClick={() => editor.chain().focus().toggleItalic().run()}
        >
            <Italic className="size-4" />
        </ToolbarButton>
        <ToolbarButton
            label="Subrayado"
            active={state.underline}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
            <UnderlineIcon className="size-4" />
        </ToolbarButton>
        <ToolbarButton
            label="Tachado"
            active={state.strike}
            onClick={() => editor.chain().focus().toggleStrike().run()}
        >
            <Strikethrough className="size-4" />
        </ToolbarButton>

        <Divider />

        <ToolbarButton
            label="Lista con viñetas"
            active={state.bulletList}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
            <List className="size-4" />
        </ToolbarButton>
        <ToolbarButton
            label="Lista numerada"
            active={state.orderedList}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
            <ListOrdered className="size-4" />
        </ToolbarButton>

        <Divider />

        <ToolbarButton
            label="Alinear a la izquierda"
            active={state.alignLeft}
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
        >
            <AlignLeft className="size-4" />
        </ToolbarButton>
        <ToolbarButton
            label="Centrar"
            active={state.alignCenter}
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
        >
            <AlignCenter className="size-4" />
        </ToolbarButton>
        <ToolbarButton
            label="Alinear a la derecha"
            active={state.alignRight}
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
        >
            <AlignRight className="size-4" />
        </ToolbarButton>
        <ToolbarButton
            label="Justificar"
            active={state.alignJustify}
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
        >
            <AlignJustify className="size-4" />
        </ToolbarButton>

        <Divider />

        <ToolbarButton
            label="Enlace"
            active={state.link}
            onClick={onLinkClick}
        >
            <LinkIcon className="size-4" />
        </ToolbarButton>
        {onImageClick && (
            <>
                <Divider />
                <ToolbarButton
                    label="Insertar imagen"
                    active={false}
                    onClick={onImageClick}
                >
                    <ImageIcon className="size-4" />
                </ToolbarButton>
            </>
        )}
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
                onDragStart={(e) => e.dataTransfer.setData('text/plain', token)}
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

const MIN_IMAGE_WIDTH = 40;

// Las imágenes propias se guardan con ruta relativa (/api/...). En producción la API
// está en otro dominio, así que el editor las pide a config.apiBase.
const resolveImageSrc = (src: string): string =>
    src.startsWith('/api/')
        ? `${config.apiBase.replace(/\/api$/, '')}${src}`
        : src;

// Al pegar, el tamaño del HTML de origen (suele ser pequeño) no se conserva:
// la imagen toma su tamaño natural. El contenido ya guardado sí conserva su tamaño.
const stripPastedImageSize = (html: string): string => {
    const doc = new DOMParser().parseFromString(html, 'text/html');

    doc.querySelectorAll('img').forEach((img) => {
        img.removeAttribute('width');
        img.removeAttribute('height');
    });

    return doc.body.innerHTML;
};

// Ancho natural de una imagen (null si no carga). No usa Image: en este archivo
// Image es la extensión de Tiptap.
const loadNaturalWidth = (src: string): Promise<number | null> =>
    new Promise((resolve) => {
        const img = document.createElement('img');

        img.onload = () => resolve(img.naturalWidth);
        img.onerror = () => resolve(null);
        img.src = src;
    });

// Imagen con asa en la esquina inferior derecha. El tamaño va en el atributo width
// (permitido por el sanitizador del backend), no en style: la proporción la da h-auto.
const ResizableImageView = ({
    node,
    updateAttributes,
    selected,
}: NodeViewProps) => {
    const imgRef = useRef<HTMLImageElement>(null);

    const startResize = (e: ReactPointerEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();

        const img = imgRef.current;

        if (!img) return;

        const startX = e.clientX;
        const startWidth = img.getBoundingClientRect().width;
        // El padre se ajusta a la imagen (inline-block), así que el tope es el área de edición.
        const maxWidth = img.closest('.ProseMirror')?.clientWidth ?? Infinity;

        const onMove = (ev: PointerEvent) => {
            const width = Math.min(
                maxWidth,
                Math.max(
                    MIN_IMAGE_WIDTH,
                    Math.round(startWidth + ev.clientX - startX),
                ),
            );

            // height a null: la proporción la mantiene el navegador (h-auto).
            updateAttributes({ width, height: null });
        };

        const onUp = () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
    };

    return (
        <NodeViewWrapper className="relative inline-block max-w-full">
            <img
                ref={imgRef}
                src={resolveImageSrc(node.attrs.src)}
                alt={node.attrs.alt ?? ''}
                width={node.attrs.width ?? undefined}
                className={cn(
                    'block h-auto max-w-full rounded',
                    selected && 'outline-2 outline-ring',
                )}
            />
            {selected && (
                <div
                    role="presentation"
                    onPointerDown={startResize}
                    className="absolute -right-1 -bottom-1 size-3 cursor-nwse-resize rounded-sm bg-primary"
                />
            )}
        </NodeViewWrapper>
    );
};

const ResizableImage = Image.extend({
    addNodeView() {
        return ReactNodeViewRenderer(ResizableImageView);
    },
});

interface RichTextEditorProps {
    value: string;
    onChange: (html: string) => void;
    className?: string;
    contentClassName?: string;
    placeholders?: EditorPlaceholder[];
    onImageUpload?: (file: File) => Promise<string | null>;
}

// Editor de texto enriquecido reutilizable; el valor entra y sale como HTML.
export const RichTextEditor = ({
    value,
    onChange,
    className,
    contentClassName = 'min-h-75',
    placeholders,
    onImageUpload,
}: RichTextEditorProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [linkDialogOpen, setLinkDialogOpen] = useState(false);
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [2, 3] },
                link: false,
                underline: false,
            }),
            FontSize,
            Underline,
            Link.configure({ openOnClick: false, autolink: true }),
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            ResizableImage.configure({ inline: false, allowBase64: true }),
        ],
        content: value,
        editorProps: {
            transformPastedHTML: stripPastedImageSize,
        },
        onUpdate: ({ editor }) => onChange(editor.getHTML()),
    });

    const toolbarState = useEditorState({
        editor,
        selector: ({ editor }): ToolbarState => ({
            bold: editor?.isActive('bold') ?? false,
            italic: editor?.isActive('italic') ?? false,
            underline: editor?.isActive('underline') ?? false,
            strike: editor?.isActive('strike') ?? false,
            heading2: editor?.isActive('heading', { level: 2 }) ?? false,
            heading3: editor?.isActive('heading', { level: 3 }) ?? false,
            bulletList: editor?.isActive('bulletList') ?? false,
            orderedList: editor?.isActive('orderedList') ?? false,
            alignLeft: editor?.isActive({ textAlign: 'left' }) ?? false,
            alignCenter: editor?.isActive({ textAlign: 'center' }) ?? false,
            alignRight: editor?.isActive({ textAlign: 'right' }) ?? false,
            alignJustify: editor?.isActive({ textAlign: 'justify' }) ?? false,
            link: editor?.isActive('link') ?? false,
            fontSize:
                (editor?.getAttributes('textStyle').fontSize as string) ?? '',
        }),
    });

    if (!editor) return null;

    const hasPlaceholders = placeholders && placeholders.length > 0;

    const handleImageFile = async (file: File) => {
        if (!onImageUpload) return;

        const src = await onImageUpload(file);

        if (!src) return;

        // Tamaño natural, como mucho el ancho del editor (la proporción la da h-auto).
        const naturalWidth = await loadNaturalWidth(resolveImageSrc(src));
        const editorWidth = editor.view.dom.clientWidth;
        const width =
            naturalWidth === null
                ? undefined
                : Math.min(naturalWidth, editorWidth);

        editor.chain().focus().setImage({ src, width }).run();
    };

    return (
        <div className={cn('grid min-w-0 grid-cols-1', className)}>
            <Toolbar
                editor={editor}
                state={toolbarState}
                onLinkClick={() => setLinkDialogOpen(true)}
                onImageClick={
                    onImageUpload
                        ? () => fileInputRef.current?.click()
                        : undefined
                }
            />
            {onImageUpload && (
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                        const file = e.target.files?.[0];

                        e.target.value = '';
                        if (file) void handleImageFile(file);
                    }}
                />
            )}
            <OverlayScrollbarsComponent
                options={scrollbarOptions}
                defer
                className={cn(
                    'border border-input bg-transparent',
                    hasPlaceholders ? 'border-b-0' : 'rounded-b-lg',
                    'focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50',
                    contentClassName,
                )}
            >
                <EditorContent
                    editor={editor}
                    className={cn(
                        'min-h-32 px-3 py-2 text-sm outline-none',
                        '[&_.tiptap]:outline-none',
                        '[&_h2]:text-lg [&_h2]:font-semibold',
                        '[&_h3]:text-base [&_h3]:font-semibold',
                        '[&_ul]:list-disc [&_ul]:pl-5',
                        '[&_ol]:list-decimal [&_ol]:pl-5',
                        '[&_a]:text-primary [&_a]:underline',
                        'min-w-0 break-words',
                        '[&_img]:my-2 [&_img]:h-auto [&_img]:max-w-full',
                    )}
                />
            </OverlayScrollbarsComponent>
            {hasPlaceholders && (
                <PlaceholderPalette
                    editor={editor}
                    placeholders={placeholders}
                />
            )}
            <LinkDialog
                open={linkDialogOpen}
                initialValue={
                    (editor.getAttributes('link').href as string | undefined) ??
                    ''
                }
                hasLink={toolbarState.link}
                onOpenChange={setLinkDialogOpen}
                onSubmit={(url) => {
                    editor
                        .chain()
                        .focus()
                        .extendMarkRange('link')
                        .setLink({ href: url })
                        .run();
                    setLinkDialogOpen(false);
                }}
                onRemove={() => {
                    editor
                        .chain()
                        .focus()
                        .extendMarkRange('link')
                        .unsetLink()
                        .run();
                    setLinkDialogOpen(false);
                }}
            />
        </div>
    );
};
