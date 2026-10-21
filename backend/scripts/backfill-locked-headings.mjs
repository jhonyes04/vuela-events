// Añade data-locked-heading="true" a los <p><strong>apartado</strong></p> ya
// existentes en proyectos creados antes de este cambio, para que también
// queden protegidos contra borrado en el editor.
//
// Por defecto solo informa, no escribe. Para aplicar los cambios:
//   node --import tsx scripts/backfill-locked-headings.mjs --apply
import { prisma } from '../src/lib/prisma.ts';

const APPLY = process.argv.includes('--apply');

const esc = (s) =>
    s
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .replace(/&/g, '&amp;')
        .replace(/>/g, '&gt;')
        .replace(/</g, '&lt;');

// Cada apartado puede estar en 3 estados en el HTML guardado:
// - 'locked': ya tiene data-locked-heading, no hay nada que hacer.
// - 'clean': <p><strong>apartado</strong></p> aislado, se puede bloquear solo.
// - 'ambiguous': el texto aparece pero no en ese patrón exacto (comparte
//   párrafo con contenido real, o el texto no coincide del todo) — requiere
//   revisión manual, el script no lo toca.
const sectionState = (html, section) => {
    const cleanPattern = new RegExp(
        `<p([^>]*)><strong>${esc(section)}</strong></p>`,
    );
    const match = html.match(cleanPattern);

    if (match) {
        return /data-locked-heading/.test(match[1]) ? 'locked' : 'clean';
    }

    const plainText = html.replace(/<[^>]*>/g, '');

    return plainText.includes(section) ? 'ambiguous' : 'missing';
};

const lockHeadings = (html, sections) => {
    let result = html;

    for (const section of sections) {
        const pattern = new RegExp(
            `<p([^>]*)><strong>${esc(section)}</strong></p>`,
        );

        result = result.replace(pattern, (match, attrs) => {
            if (/data-locked-heading/.test(attrs)) return match;

            return `<p${attrs} data-locked-heading="true"><strong>${section
                .replace(/&/g, '&amp;')
                .replace(/>/g, '&gt;')
                .replace(/</g, '&lt;')}</strong></p>`;
        });
    }

    return result;
};

const settings = await prisma.appSettings.findUnique({
    where: { id: 'default' },
});
const openingSections = settings?.projectOpeningSections ?? [];
const closingSections = settings?.projectClosingSections ?? [];

const projects = await prisma.project.findMany({
    select: {
        id: true,
        name: true,
        openingInstructions: true,
        closingInstructions: true,
    },
});

console.log(APPLY ? 'Modo: APLICAR cambios\n' : 'Modo: solo informar (--apply para escribir)\n');

for (const project of projects) {
    const report = [];

    for (const section of openingSections) {
        if (project.openingInstructions) {
            report.push([
                'opening',
                section,
                sectionState(project.openingInstructions, section),
            ]);
        }
    }
    for (const section of closingSections) {
        if (project.closingInstructions) {
            report.push([
                'closing',
                section,
                sectionState(project.closingInstructions, section),
            ]);
        }
    }

    const toFix = report.filter(([, , state]) => state === 'clean');
    const ambiguous = report.filter(([, , state]) => state === 'ambiguous');

    if (toFix.length === 0 && ambiguous.length === 0) {
        console.log(`${project.name}: nada que hacer`);
        continue;
    }

    console.log(`${project.name}:`);
    for (const [field, section] of toFix) {
        console.log(`  bloquear (${field}): ${section}`);
    }
    for (const [field, section] of ambiguous) {
        console.log(`  AMBIGUO, revisar a mano (${field}): ${section}`);
    }

    if (!APPLY || toFix.length === 0) continue;

    const opening = project.openingInstructions
        ? lockHeadings(project.openingInstructions, openingSections)
        : project.openingInstructions;
    const closing = project.closingInstructions
        ? lockHeadings(project.closingInstructions, closingSections)
        : project.closingInstructions;

    await prisma.project.update({
        where: { id: project.id },
        data: { openingInstructions: opening, closingInstructions: closing },
    });
    console.log(`  -> actualizado`);
}

await prisma.$disconnect();
