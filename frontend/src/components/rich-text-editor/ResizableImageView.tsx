import { useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { cn } from '@/lib/utils';
import { MIN_IMAGE_WIDTH, resolveImageSrc } from './imageHelpers';

// Imagen con asa en la esquina inferior derecha. El tamaño va en el atributo width
// (permitido por el sanitizador del backend), no en style: la proporción la da h-auto.
export const ResizableImageView = ({
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
