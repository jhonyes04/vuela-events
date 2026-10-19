import { getStats } from './stats.js';
import { PUNTOS_VUELA_LOGO, PUNTOS_VUELA_LOGO_RATIO } from '../assets/logos.js';

// Mismos ids que el diálogo de selección del frontend
// (features/stats/lib/printSections.ts): todas las secciones salvo
// Pendientes — única fuente de verdad del lado del servidor para qué se
// puede pedir. Grupos en orden alfabético (determina el orden de las
// páginas del PDF); dentro de cada uno, orden lógico (mes antes que
// trimestre antes que año...).
export const PRINT_SECTION_IDS = [
    'attended-month',
    'attended-quarter',
    'attended-year',
    'attended-total',
    'attended-project',
    'events-month',
    'events-quarter',
    'events-year',
    'events-status',
    'events-project',
    'reg-month',
    'reg-project',
    'occupancy',
    'users-all',
    'users-interest-project',
    'project-participants',
    'project-user-participations',
    'users-top',
] as const;

export type PrintSectionId = (typeof PRINT_SECTION_IDS)[number];

export type Stats = Awaited<ReturnType<typeof getStats>>;

export interface CapturedImage {
    // Captura PNG del gráfico tal y como se ve en pantalla (base64, con o
    // sin el prefijo "data:image/png;base64,").
    dataUrl: string;
    width: number;
    height: number;
}

// Mismo "object-fit: contain" que aplicaría el navegador.
export const fitSize = (
    imgWidth: number,
    imgHeight: number,
    maxWidth: number,
    maxHeight: number,
) => {
    const ratio = Math.min(maxWidth / imgWidth, maxHeight / imgHeight);

    return { width: imgWidth * ratio, height: imgHeight * ratio };
};

export const bufferFromDataUrl = (dataUrl: string): Buffer => {
    const base64 = dataUrl.includes(',')
        ? dataUrl.slice(dataUrl.indexOf(',') + 1)
        : dataUrl;

    return Buffer.from(base64, 'base64');
};

export const COLUMN_GAP = 16;

// Mitad del ancho de contenido de la página — para colocar dos imágenes
// lado a lado.
export const halfWidth = (doc: PDFKit.PDFDocument): number => {
    const full =
        doc.page.width - doc.page.margins.left - doc.page.margins.right;

    return (full - COLUMN_GAP) / 2;
};

// Alto final que ocupará la imagen ajustada a un ancho dado (sin dibujar
// nada) — necesario para decidir si cabe antes de colocarla.
export const imageHeightAt = (
    image: CapturedImage,
    width: number,
    maxHeight: number,
): number => fitSize(image.width, image.height, width, maxHeight).height;

// La captura es el propio ChartCard/Kpi tal y como se ve en pantalla (fondo,
// sombra y título ya incluidos): aquí solo se coloca, sin volver a dibujar
// un marco — si no, quedaría una card dentro de otra card. Devuelve el alto
// real dibujado.
export const placeImageAt = (
    doc: PDFKit.PDFDocument,
    image: CapturedImage,
    x: number,
    y: number,
    width: number,
    maxHeight: number,
): number => {
    const { width: imgW, height: imgH } = fitSize(
        image.width,
        image.height,
        width,
        maxHeight,
    );

    doc.image(bufferFromDataUrl(image.dataUrl), x, y, {
        width: imgW,
        height: imgH,
    });

    return imgH;
};

const TZ = 'Europe/Madrid';

const generatedAtFormat = new Intl.DateTimeFormat('es-ES', {
    timeZone: TZ,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
});

export const GROUP_OF: Record<PrintSectionId, string> = {
    'events-month': 'Eventos',
    'events-quarter': 'Eventos',
    'events-year': 'Eventos',
    'events-status': 'Eventos',
    'events-project': 'Eventos',
    'reg-month': 'Inscripciones',
    'reg-project': 'Inscripciones',
    occupancy: 'Ocupación',
    'users-all': 'Participantes',
    'users-interest-project': 'Participantes',
    'project-participants': 'Participantes',
    'project-user-participations': 'Participantes',
    'users-top': 'Participantes',
    'attended-month': 'Atendidos',
    'attended-quarter': 'Atendidos',
    'attended-year': 'Atendidos',
    'attended-total': 'Atendidos',
    'attended-project': 'Atendidos',
};

export const sectionTitle = (doc: PDFKit.PDFDocument, text: string) => {
    doc.font('Helvetica-Bold').fontSize(14).fillColor('black').text(text);
    doc.moveDown(0.1);
    doc.moveTo(doc.page.margins.left, doc.y)
        .lineTo(doc.page.width - doc.page.margins.right, doc.y)
        .stroke('#e5e7eb');
    doc.moveDown(0.6);
    doc.fillColor('black');
};

const KPI_IMAGE_MAX_HEIGHT = 170;

export interface KpiImages {
    events?: CapturedImage;
    attended?: CapturedImage;
}

// Logo + título + período + fecha de generación + KPIs. Dibuja solo las
// cards (Eventos/Atendidos) cuyas capturas llegan, una al lado de otra si
// llegan las dos, o a todo el ancho si llega una sola — refleja qué
// secciones se eligieron al generar el PDF.
export const drawReportHeader = (
    doc: PDFKit.PDFDocument,
    year: number | null,
    now: Date,
    kpiImages?: KpiImages,
) => {
    const logoWidth = 110;
    const logoHeight = logoWidth * PUNTOS_VUELA_LOGO_RATIO;

    doc.image(PUNTOS_VUELA_LOGO, 30, doc.y, {
        width: logoWidth,
    });
    doc.y += logoHeight + 10;

    const yearLabel = year === null ? 'Todos los años' : String(year);

    doc.font('Helvetica-Bold')
        .fontSize(18)
        .fillColor('black')
        .text('Estadísticas Vuela Events');
    doc.font('Helvetica').fontSize(10).fillColor('#444');
    doc.text(`Período: ${yearLabel}`);
    doc.text(`Generado: ${generatedAtFormat.format(now)}`);
    doc.fillColor('black');
    doc.moveDown(0.5);

    const kpiEntries = [kpiImages?.events, kpiImages?.attended].filter(
        (img): img is CapturedImage => !!img,
    );

    if (kpiEntries.length > 0) {
        const left = doc.page.margins.left;
        const width =
            kpiEntries.length === 2
                ? halfWidth(doc)
                : doc.page.width - left - doc.page.margins.right;
        const rowHeight = Math.max(
            ...kpiEntries.map((img) =>
                imageHeightAt(img, width, KPI_IMAGE_MAX_HEIGHT),
            ),
        );

        kpiEntries.forEach((img, i) => {
            placeImageAt(
                doc,
                img,
                left + i * (width + COLUMN_GAP),
                doc.y,
                width,
                KPI_IMAGE_MAX_HEIGHT,
            );
        });

        doc.x = left;
        doc.y += rowHeight + 10;
    }
};
