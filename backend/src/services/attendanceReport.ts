import PDFDocument from 'pdfkit';
import { prisma } from '../lib/prisma.js';
import { getSignatureImage } from './profile.js';

const TZ = 'Europe/Madrid';

const dateFormat = new Intl.DateTimeFormat('es-ES', {
    timeZone: TZ,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
});

const timeFormat = new Intl.DateTimeFormat('es-ES', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
});

export type AttendanceReportFailure = 'event_not_found' | 'no_recipients';

export class AttendanceReportError extends Error {
    readonly reason: AttendanceReportFailure;

    constructor(reason: AttendanceReportFailure) {
        super(reason);

        this.name = 'AttendanceReportError';
        this.reason = reason;
    }
}

interface GenerateInput {
    eventId: string;
    recipientRegistrationIds: string[];
    signerUserId: string;
}

export const generateAttendanceReport = async (
    input: GenerateInput,
): Promise<Buffer> => {
    if (input.recipientRegistrationIds.length === 0) {
        throw new AttendanceReportError('no_recipients');
    }

    const event = await prisma.event.findUnique({
        where: { id: input.eventId },
        select: {
            title: true,
            subtitle: true,
            location: true,
            startsAt: true,
            endsAt: true,
        },
    });

    if (!event) {
        throw new AttendanceReportError('event_not_found');
    }

    // Acotado al evento: así nadie puede colar el id de inscripción de otro
    // evento para que aparezca en un acta ajena.
    const registrations = await prisma.registration.findMany({
        where: {
            id: { in: input.recipientRegistrationIds },
            eventId: input.eventId,
        },
        select: {
            user: {
                select: { name: true, lastName: true, puntoVuela: true },
            },
        },
        orderBy: [{ user: { puntoVuela: 'asc' } }, { user: { name: 'asc' } }],
    });

    const signer = await prisma.user.findUnique({
        where: { id: input.signerUserId },
        select: { name: true, lastName: true },
    });

    const signatureImage = await getSignatureImage(input.signerUserId);

    return renderPdf({
        event,
        attendees: registrations.map((r) => r.user),
        signerName: signer ? `${signer.name} ${signer.lastName}`.trim() : '',
        signatureImage,
    });
};

interface RenderInput {
    event: {
        title: string;
        subtitle: string | null;
        location: string | null;
        startsAt: Date;
        endsAt: Date;
    };
    attendees: { name: string; lastName: string; puntoVuela: string | null }[];
    signerName: string;
    signatureImage: Buffer | null;
}

const renderPdf = ({
    event,
    attendees,
    signerName,
    signatureImage,
}: RenderInput): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        doc.font('Helvetica-Bold')
            .fontSize(16)
            .text(`Asistencia ${event.title}`, { align: 'center' });
        doc.moveDown(1.5);

        doc.fontSize(11);
        doc.font('Helvetica-Bold')
            .text('LUGAR: ', { continued: true })
            .font('Helvetica')
            .text(event.location ?? '');
        doc.font('Helvetica-Bold')
            .text('FECHA: ', { continued: true })
            .font('Helvetica')
            .text(dateFormat.format(event.startsAt));
        doc.font('Helvetica-Bold')
            .text('HORA: ', { continued: true })
            .font('Helvetica')
            .text(
                `${timeFormat.format(event.startsAt)} a ${timeFormat.format(event.endsAt)} horas.`,
            );
        doc.moveDown();

        if (event.subtitle) {
            doc.font('Helvetica').text(`•  ${event.subtitle}`);
            doc.moveDown();
        }

        const left = doc.page.margins.left;
        const tableWidth = doc.page.width - left - doc.page.margins.right;
        const col1 = left;
        const col2 = left + tableWidth * 0.3;
        const col3 = left + tableWidth * 0.75;
        const rowHeight = 24;

        let y = doc.y;

        doc.rect(col1, y, tableWidth, rowHeight).fill('#f5c518');
        doc.fillColor('black').font('Helvetica-Bold').fontSize(10);
        doc.text('PUNTO VUELA', col1 + 5, y + 7, { width: col2 - col1 - 10 });
        doc.text('NOMBRE Y APELLIDOS', col2 + 5, y + 7, {
            width: col3 - col2 - 10,
        });
        doc.text('ASISTE', col3 + 5, y + 7, {
            width: col1 + tableWidth - col3 - 10,
        });
        y += rowHeight;

        doc.font('Helvetica').fontSize(10);

        for (const attendee of attendees) {
            doc.rect(col1, y, tableWidth, rowHeight).stroke();
            doc.text(attendee.puntoVuela ?? '', col1 + 5, y + 7, {
                width: col2 - col1 - 10,
            });
            doc.text(
                `${attendee.name} ${attendee.lastName}`.trim(),
                col2 + 5,
                y + 7,
                { width: col3 - col2 - 10 },
            );
            doc.text('Sí', col3 + 5, y + 7, {
                width: col1 + tableWidth - col3 - 10,
            });
            y += rowHeight;
        }

        doc.y = y + 40;
        doc.font('Helvetica').fontSize(11);
        doc.text('Dinamizadora Territorial convocante:');

        if (signatureImage) {
            doc.image(signatureImage, doc.x, doc.y + 10, { fit: [150, 60] });
            doc.y += 75;
        } else {
            doc.moveDown(3);
        }

        doc.text(`Fdo.: ${signerName}`);

        doc.end();
    });
};
