import type { ReactNode } from 'react';
import type { Editor } from '@tiptap/react';
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
    MousePointerClick,
    Strikethrough,
    Underline as UnderlineIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IconTooltip } from '@/components/IconTooltip';
import { FONT_SIZES } from './extensions';

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

export interface ToolbarState {
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
    buttonLink: boolean;
    fontSize: string;
}

interface ToolbarProps {
    editor: Editor;
    state: ToolbarState;
    onLinkClick: () => void;
    onButtonClick: () => void;
    onImageClick?: () => void;
}

export const Toolbar = ({
    editor,
    state,
    onLinkClick,
    onButtonClick,
    onImageClick,
}: ToolbarProps) => (
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
            active={state.link && !state.buttonLink}
            onClick={onLinkClick}
        >
            <LinkIcon className="size-4" />
        </ToolbarButton>
        <ToolbarButton
            label="Insertar botón"
            active={state.buttonLink}
            onClick={onButtonClick}
        >
            <MousePointerClick className="size-4" />
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
