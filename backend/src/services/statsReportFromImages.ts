import PDFDocument from 'pdfkit';
import {
    drawReportHeader,
    GROUP_OF,
    imageHeightAt,
    placeImageAt,
    PRINT_SECTION_IDS,
    sectionTitle,
    type CapturedImage,
    type KpiImages,
    type PrintSectionId,
} from './statsReportShared.js';

export type { CapturedImage, KpiImages } from './statsReportShared.js';

export interface GenerateStatsReportFromImagesInput {
    now: Date;
    year: number | null;
    images: Partial<Record<PrintSectionId, CapturedImage>>;
    // Capturas de las cards de Eventos/Atendidos; opcionales por
    // compatibilidad, pero siempre se envían desde StatsCaptureView.
    kpiImages?: KpiImages;
}

const MAX_CARD_IMAGE_HEIGHT = 420;

const IMAGE_GAP = 16;

// Recorre las páginas ya generadas (requiere bufferPages) y escribe
// "Página X de Y" centrado en el pie de cada una.
const drawPageNumbers = (doc: PDFKit.PDFDocument) => {
    const range = doc.bufferedPageRange();

    for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);

        const width =
            doc.page.width -
            doc.page.margins.left -
            doc.page.margins.right;

        // La posición (height - 30) cae dentro del margen inferior: sin
        // esto, pdfkit cree que el texto "no cabe" y añade una página en
        // blanco para escribirlo ahí, en vez de pisar el pie de la actual.
        const bottomMargin = doc.page.margins.bottom;
        doc.page.margins.bottom = 0;

        doc.font('Helvetica')
            .fontSize(8)
            .fillColor('#9ca3af')
            .text(
                `Página ${i + 1} de ${range.count}`,
                doc.page.margins.left,
                doc.page.height - 30,
                { width, align: 'center', lineBreak: false },
            );
        doc.fillColor('black');
        doc.page.margins.bottom = bottomMargin;
    }
};

export const generateStatsReportFromImages = async (
    input: GenerateStatsReportFromImagesInput,
): Promise<{ pdf: Buffer; filename: string }> => {
    const pdf = await renderPdf(input);
    const yearLabel =
        input.year === null ? 'todos los años' : String(input.year);

    return {
        pdf,
        filename: `Estadísticas Vuela Events (${yearLabel}).pdf`,
    };
};

const renderPdf = (
    input: GenerateStatsReportFromImagesInput,
): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
        // bufferPages: hace falta conocer el total de páginas (para el pie
        // "Página X de Y") antes de cerrar el documento.
        const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const hasGroup = (group: string) =>
            PRINT_SECTION_IDS.some(
                (id) => GROUP_OF[id] === group && input.images[id],
            );

        const kpiImages: KpiImages | undefined = input.kpiImages && {
            events: hasGroup('Eventos') ? input.kpiImages.events : undefined,
            attended: hasGroup('Atendidos')
                ? input.kpiImages.attended
                : undefined,
        };

        drawReportHeader(doc, input.year, input.now, kpiImages);

        let currentGroup: string | null = null;

        // Una gráfica por fila, a todo el ancho; una sección por página:
        // nunca se mezclan dos grupos ni se corta una imagen entre páginas.
        for (const id of PRINT_SECTION_IDS) {
            const image = input.images[id];

            if (!image) continue;

            const group = GROUP_OF[id];
            const left = doc.page.margins.left;
            const width =
                doc.page.width - left - doc.page.margins.right;

            if (group !== currentGroup) {
                if (currentGroup !== null) doc.addPage();

                sectionTitle(doc, group);
                currentGroup = group;
            } else {
                const bottom = doc.page.height - doc.page.margins.bottom;

                if (
                    doc.y + imageHeightAt(image, width, MAX_CARD_IMAGE_HEIGHT) >
                    bottom
                ) {
                    doc.addPage();
                    sectionTitle(doc, group);
                }
            }

            const imgH = placeImageAt(
                doc,
                image,
                left,
                doc.y,
                width,
                MAX_CARD_IMAGE_HEIGHT,
            );

            doc.x = left;
            doc.y += imgH + IMAGE_GAP;
        }

        drawPageNumbers(doc);
        doc.end();
    });
};
