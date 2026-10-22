import { useRef, useState } from 'react';
import {
    EditorContent,
    useEditor,
    useEditorState,
} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import { scrollbarOptions } from '@/lib/overlayScrollbarsOptions';
import { cn } from '@/lib/utils';
import { Toolbar, type ToolbarState } from './rich-text-editor/Toolbar';
import { LinkDialog, type LinkDialogMode } from './rich-text-editor/LinkDialog';
import {
    PlaceholderPalette,
    type EditorPlaceholder,
} from './rich-text-editor/PlaceholderPalette';
import {
    FontSize,
    BUTTON_LINK_STYLE,
    LinkWithButton,
    LockedHeading,
} from './rich-text-editor/extensions';
import { ResizableImage } from './rich-text-editor/ResizableImage';
import {
    resolveImageSrc,
    stripPastedImageSize,
    loadNaturalWidth,
} from './rich-text-editor/imageHelpers';

export type { EditorPlaceholder };

interface RichTextEditorProps {
    value: string;
    onChange: (html: string) => void;
    className?: string;
    contentClassName?: string;
    placeholders?: EditorPlaceholder[];
    onImageUpload?: (file: File) => Promise<string | null>;
    // Activa el nodo LockedHeading (párrafos con data-locked-heading="true"
    // no editables ni borrables). No afecta a otros usos de este componente.
    lockedHeadings?: boolean;
}

// Editor de texto enriquecido reutilizable; el valor entra y sale como HTML.
export const RichTextEditor = ({
    value,
    onChange,
    className,
    contentClassName = 'min-h-75',
    placeholders,
    onImageUpload,
    lockedHeadings,
}: RichTextEditorProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [linkDialogMode, setLinkDialogMode] = useState<LinkDialogMode | null>(
        null,
    );
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [2, 3] },
                link: false,
                underline: false,
            }),
            FontSize,
            Underline,
            LinkWithButton.configure({ openOnClick: false, autolink: true }),
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            ResizableImage.configure({ inline: false, allowBase64: true }),
            ...(lockedHeadings ? [LockedHeading] : []),
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
            buttonLink: Boolean(editor?.getAttributes('link').buttonStyle),
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
                onLinkClick={() => setLinkDialogMode('link')}
                onButtonClick={() => setLinkDialogMode('button')}
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
                mode={linkDialogMode}
                initialValue={
                    (editor.getAttributes('link').href as string | undefined) ??
                    ''
                }
                initialLabel={editor.state.doc.textBetween(
                    editor.state.selection.from,
                    editor.state.selection.to,
                    ' ',
                )}
                hasLink={toolbarState.link}
                onOpenChange={(open) => !open && setLinkDialogMode(null)}
                onSubmit={(url, label) => {
                    if (linkDialogMode === 'button') {
                        // insertContent reemplaza la selección (o inserta en
                        // el cursor si no hay nada seleccionado) con el texto
                        // ya marcado como link+botón en un solo paso.
                        editor
                            .chain()
                            .focus()
                            .insertContent({
                                type: 'text',
                                text: label,
                                marks: [
                                    {
                                        type: 'link',
                                        attrs: {
                                            href: url,
                                            buttonStyle: BUTTON_LINK_STYLE,
                                        },
                                    },
                                ],
                            })
                            .run();
                    } else {
                        editor
                            .chain()
                            .focus()
                            .extendMarkRange('link')
                            .setMark('link', { href: url, buttonStyle: null })
                            .run();
                    }
                    setLinkDialogMode(null);
                }}
                onRemove={() => {
                    editor
                        .chain()
                        .focus()
                        .extendMarkRange('link')
                        .unsetLink()
                        .run();
                    setLinkDialogMode(null);
                }}
            />
        </div>
    );
};
