// Cada tipo de estadística es una sola sección: el selector muestra una a la vez.
export const SECTIONS = [
    { id: 'events-month', label: 'Por mes', group: 'Eventos' },
    { id: 'events-quarter', label: 'Por trimestre', group: 'Eventos' },
    { id: 'events-year', label: 'Por año', group: 'Eventos' },
    {
        id: 'events-status',
        label: 'Estado (pasados, en curso, próximos)',
        group: 'Eventos',
    },
    { id: 'events-category', label: 'Por categoría', group: 'Eventos' },
    { id: 'events-guide', label: 'Por guía', group: 'Eventos' },
    { id: 'reg-month', label: 'Inscripciones por mes', group: 'Inscripciones' },
    {
        id: 'reg-category',
        label: 'Inscripciones por categoría',
        group: 'Inscripciones',
    },
    {
        id: 'reg-top-events',
        label: 'Eventos con más inscritos',
        group: 'Inscripciones',
    },
    { id: 'occupancy', label: 'Ocupación', group: 'Ocupación' },
    { id: 'users-top', label: 'Usuarios más activos', group: 'Usuarios' },
    { id: 'users-all', label: 'Todos los usuarios', group: 'Usuarios' },
    { id: 'attended-month', label: 'Atendidos por mes', group: 'Atendidos' },
    {
        id: 'attended-quarter',
        label: 'Atendidos por trimestre',
        group: 'Atendidos',
    },
    { id: 'attended-year', label: 'Atendidos por año', group: 'Atendidos' },
    { id: 'attended-total', label: 'Atendidos en total', group: 'Atendidos' },
    {
        id: 'attended-category',
        label: 'Atendidos por categoría',
        group: 'Atendidos',
    },
    {
        id: 'pending',
        label: 'Finalizados sin dato de atendidos',
        group: 'Pendientes',
    },
] as const;

export const GROUP_ORDER = [
    'Eventos',
    'Inscripciones',
    'Ocupación',
    'Usuarios',
    'Atendidos',
    'Pendientes',
] as const;

export type SectionId = (typeof SECTIONS)[number]['id'];
export type GroupId = (typeof GROUP_ORDER)[number];
