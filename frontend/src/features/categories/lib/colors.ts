export const CATEGORY_COLORS = [
    'yellow',
    'amber',
    'emerald',
    'sky',
    'rose',
    'violet',
    // 'slate',
    'orange',
    'pink',
    // 'gray',
    // 'zinc',
    // 'neutral',
    // 'stone',
    'lime',
    // 'green',
    // 'teal',
    // 'cyan',
    // 'blue',
    // 'indigo',
    // 'purple',
    'fuchsia',
] as const;

export type CategoryColor = (typeof CATEGORY_COLORS)[number];

interface CategoryColorStyle {
    label: string;
    chip: string;
    swatch: string;
    border: string;
    // Fondo suave del header de la tarjeta; el texto se queda en su color normal.
    tint: string;
}

export const CATEGORY_COLOR_STYLES: Record<CategoryColor, CategoryColorStyle> =
    {
        yellow: {
            label: 'Amarillo',
            chip: 'bg-brand-yellow text-brand-ink',
            swatch: 'bg-brand-yellow',
            border: 'border-t-brand-yellow',
            tint: 'bg-brand-yellow/15',
        },
        amber: {
            label: 'Ámbar',
            chip: 'bg-amber-500 text-white',
            swatch: 'bg-amber-500',
            border: 'border-t-amber-500',
            tint: 'bg-amber-500/10',
        },
        emerald: {
            label: 'Esmeralda',
            chip: 'bg-emerald-500 text-white',
            swatch: 'bg-emerald-500',
            border: 'border-t-emerald-500',
            tint: 'bg-emerald-500/10',
        },
        sky: {
            label: 'Cielo',
            chip: 'bg-sky-500 text-white',
            swatch: 'bg-sky-500',
            border: 'border-t-sky-500',
            tint: 'bg-sky-500/10',
        },
        rose: {
            label: 'Rosa',
            chip: 'bg-rose-500 text-white',
            swatch: 'bg-rose-500',
            border: 'border-t-rose-500',
            tint: 'bg-rose-500/10',
        },
        violet: {
            label: 'Violeta',
            chip: 'bg-violet-500 text-white',
            swatch: 'bg-violet-500',
            border: 'border-t-violet-500',
            tint: 'bg-violet-500/10',
        },
        // slate: {
        //     label: 'Pizarra',
        //     chip: 'bg-slate-500 text-white',
        //     swatch: 'bg-slate-500',
        //     border: 'border-t-slate-500',
        //     tint: 'bg-slate-500/10',
        // },
        orange: {
            label: 'Naranja',
            chip: 'bg-orange-500 text-white',
            swatch: 'bg-orange-500',
            border: 'border-t-orange-500',
            tint: 'bg-orange-500/10',
        },
        pink: {
            label: 'Rosa fuerte',
            chip: 'bg-pink-500 text-white',
            swatch: 'bg-pink-500',
            border: 'border-t-pink-500',
            tint: 'bg-pink-500/10',
        },
        // gray: {
        //     label: 'Gris',
        //     chip: 'bg-gray-500 text-white',
        //     swatch: 'bg-gray-500',
        //     border: 'border-t-gray-500',
        //     tint: 'bg-gray-500/10',
        // },
        // zinc: {
        //     label: 'Zinc',
        //     chip: 'bg-zinc-500 text-white',
        //     swatch: 'bg-zinc-500',
        //     border: 'border-t-zinc-500',
        //     tint: 'bg-zinc-500/10',
        // },
        // neutral: {
        //     label: 'Neutro',
        //     chip: 'bg-neutral-500 text-white',
        //     swatch: 'bg-neutral-500',
        //     border: 'border-t-neutral-500',
        //     tint: 'bg-neutral-500/10',
        // },
        // stone: {
        //     label: 'Piedra',
        //     chip: 'bg-stone-500 text-white',
        //     swatch: 'bg-stone-500',
        //     border: 'border-t-stone-500',
        //     tint: 'bg-stone-500/10',
        // },
        lime: {
            label: 'Lima',
            chip: 'bg-lime-500 text-white',
            swatch: 'bg-lime-500',
            border: 'border-t-lime-500',
            tint: 'bg-lime-500/10',
        },
        // green: {
        //     label: 'Verde',
        //     chip: 'bg-green-500 text-white',
        //     swatch: 'bg-green-500',
        //     border: 'border-t-green-500',
        //     tint: 'bg-green-500/10',
        // },
        // teal: {
        //     label: 'Verde azulado',
        //     chip: 'bg-teal-500 text-white',
        //     swatch: 'bg-teal-500',
        //     border: 'border-t-teal-500',
        //     tint: 'bg-teal-500/10',
        // },
        // cyan: {
        //     label: 'Cian',
        //     chip: 'bg-cyan-500 text-white',
        //     swatch: 'bg-cyan-500',
        //     border: 'border-t-cyan-500',
        //     tint: 'bg-cyan-500/10',
        // },
        // blue: {
        //     label: 'Azul',
        //     chip: 'bg-blue-500 text-white',
        //     swatch: 'bg-blue-500',
        //     border: 'border-t-blue-500',
        //     tint: 'bg-blue-500/10',
        // },
        // indigo: {
        //     label: 'Índigo',
        //     chip: 'bg-indigo-500 text-white',
        //     swatch: 'bg-indigo-500',
        //     border: 'border-t-indigo-500',
        //     tint: 'bg-indigo-500/10',
        // },
        // purple: {
        //     label: 'Púrpura',
        //     chip: 'bg-purple-500 text-white',
        //     swatch: 'bg-purple-500',
        //     border: 'border-t-purple-500',
        //     tint: 'bg-purple-500/10',
        // },
        fuchsia: {
            label: 'Fucsia',
            chip: 'bg-fuchsia-500 text-white',
            swatch: 'bg-fuchsia-500',
            border: 'border-t-fuchsia-500',
            tint: 'bg-fuchsia-500/10',
        },
    };
