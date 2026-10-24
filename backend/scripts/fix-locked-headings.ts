// Uso único: re-bloquea los encabezados de "dar de alta" / "cerrar actividad"
// en proyectos guardados antes de permitir data-locked-heading en el saneador
// (backend/src/services/emailSignature.ts). Sin --apply solo informa qué
// cambiaría; con --apply escribe en la base de datos.
import { prisma } from '../src/lib/prisma.js';
import { sanitizeEmailHtml } from '../src/services/emailSignature.js';

const apply = process.argv.includes('--apply');
const dump = process.argv.includes('--dump');

const escapeRegExp = (text: string) =>
    text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// El HTML guardado tiene el texto ya serializado por TipTap: & < > como entidades.
const escapeHtmlText = (text: string) =>
    text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Dato corrupto visto en producción: '<pstyle="...">' en vez de '<p style="...">'
// (el navegador lo trata como una etiqueta desconocida, no como <p>).
const fixBrokenParagraphTags = (html: string | null): string | null =>
    html === null ? null : html.replace(/<p([a-zA-Z-]+=")/g, '<p $1');

const lockSections = (html: string | null, sections: string[]): string | null => {
    if (!html) return html;

    let result = html;

    for (const section of sections) {
        const escapedSection = escapeHtmlText(section);
        // El <p> puede llevar atributos (p.ej. style="text-align:justify");
        // se conservan y solo se añade data-locked-heading. El lookahead
        // negativo evita re-matchear un párrafo ya bloqueado.
        const pattern = new RegExp(
            `<p(?![^>]*data-locked-heading)([^>]*)>\\s*<strong>\\s*${escapeRegExp(escapedSection)}\\s*</strong>\\s*</p>`,
            'g',
        );

        result = result.replace(
            pattern,
            (_match, attrs: string) =>
                `<p${attrs} data-locked-heading="true"><strong>${escapedSection}</strong></p>`,
        );
    }

    return result;
};

const main = async () => {
    const settings = await prisma.appSettings.findUnique({
        where: { id: 'default' },
    });
    const openingSections = settings?.projectOpeningSections ?? [];
    const closingSections = settings?.projectClosingSections ?? [];

    if (openingSections.length === 0 && closingSections.length === 0) {
        console.log('No hay secciones configuradas en AppSettings, nada que hacer.');
        return;
    }

    const projects = await prisma.project.findMany({
        select: { id: true, name: true, openingInstructions: true, closingInstructions: true },
    });

    if (dump) {
        console.log('Secciones configuradas:');
        console.log('  alta:', JSON.stringify(openingSections));
        console.log('  cierre:', JSON.stringify(closingSections));
        for (const project of projects) {
            console.log(`\n--- ${project.name} (${project.id}) ---`);
            console.log('alta:', JSON.stringify(project.openingInstructions));
            console.log('cierre:', JSON.stringify(project.closingInstructions));
        }
        return;
    }

    let changedCount = 0;

    for (const project of projects) {
        const nextOpening = sanitizeEmailHtml(
            lockSections(
                fixBrokenParagraphTags(project.openingInstructions),
                openingSections,
            ) ?? '',
        );
        const nextClosing = sanitizeEmailHtml(
            lockSections(
                fixBrokenParagraphTags(project.closingInstructions),
                closingSections,
            ) ?? '',
        );

        const openingChanged = nextOpening !== (project.openingInstructions ?? '');
        const closingChanged = nextClosing !== (project.closingInstructions ?? '');

        if (!openingChanged && !closingChanged) continue;

        changedCount++;
        console.log(
            `${apply ? 'Actualizando' : '[dry-run] Cambiaría'}: ${project.name} (${project.id})` +
                `${openingChanged ? ' [alta]' : ''}${closingChanged ? ' [cierre]' : ''}`,
        );

        if (apply) {
            await prisma.project.update({
                where: { id: project.id },
                data: {
                    openingInstructions: openingChanged ? nextOpening || null : undefined,
                    closingInstructions: closingChanged ? nextClosing || null : undefined,
                },
            });
        }
    }

    console.log(
        `${changedCount} de ${projects.length} proyectos ${apply ? 'actualizados' : 'a actualizar'}.`,
    );
    if (!apply) {
        console.log('Ejecuta con --apply para escribir los cambios.');
    }
};

main()
    .catch((err) => {
        console.error(err);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
