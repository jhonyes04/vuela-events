import { useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import { scrollbarOptions } from '@/lib/overlayScrollbarsOptions';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface PdfCanvasPreviewProps {
    url: string;
    title: string;
    className?: string;
}

// Renderiza el PDF página a página en <canvas>, en vez de depender del
// visor nativo del navegador: en iOS Safari (y otros móviles) un <iframe>
// con una URL blob: no muestra nada, así que esto funciona igual en PC y móvil.
export const PdfCanvasPreview = ({
    url,
    title,
    className,
}: PdfCanvasPreviewProps) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let cancelled = false;
        const container = containerRef.current;

        const render = async () => {
            const pdf = await pdfjsLib.getDocument({ url }).promise;

            if (cancelled || !container) return;

            container.innerHTML = '';

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 1.5 });
                const canvas = document.createElement('canvas');

                canvas.width = viewport.width;
                canvas.height = viewport.height;
                canvas.className = 'mb-2 w-full rounded-lg border bg-white';

                const context = canvas.getContext('2d');

                if (!context) continue;

                await page.render({ canvasContext: context, viewport, canvas })
                    .promise;

                if (cancelled) return;

                container.appendChild(canvas);
            }
        };

        render();

        return () => {
            cancelled = true;
        };
    }, [url]);

    return (
        <OverlayScrollbarsComponent
            className={className}
            options={scrollbarOptions}
            defer
        >
            <div ref={containerRef} role="img" aria-label={title} />
        </OverlayScrollbarsComponent>
    );
};
