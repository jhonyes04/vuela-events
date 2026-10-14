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
    { id: 'events-project', label: 'Por proyecto', group: 'Eventos' },
    { id: 'reg-month', label: 'Inscripciones por mes', group: 'Inscripciones' },
    {
        id: 'reg-project',
        label: 'Inscripciones por proyecto',
        group: 'Inscripciones',
    },
    { id: 'occupancy', label: 'Ocupación', group: 'Ocupación' },
    { id: 'users-all', label: 'Todos los participantes', group: 'Participantes' },
    {
        id: 'users-interest-project',
        label: 'Participantes por proyecto',
        group: 'Participantes',
    },
    {
        id: 'project-participants',
        label: 'Participantes inscritos por proyecto',
        group: 'Participantes',
    },
    {
        id: 'project-user-participations',
        label: 'Participaciones por participante',
        group: 'Participantes',
    },
    { id: 'users-top', label: 'Participantes más activos', group: 'Participantes' },
    { id: 'attended-month', label: 'Atendidos por mes', group: 'Atendidos' },
    {
        id: 'attended-quarter',
        label: 'Atendidos por trimestre',
        group: 'Atendidos',
    },
    { id: 'attended-year', label: 'Atendidos por año', group: 'Atendidos' },
    { id: 'attended-total', label: 'Atendidos en total', group: 'Atendidos' },
    {
        id: 'attended-project',
        label: 'Atendidos por proyecto',
        group: 'Atendidos',
    },
    {
        id: 'pending',
        label: 'Finalizados sin dato de atendidos',
        group: 'Pendientes',
    },
] as const;

export const GROUP_ORDER = [
    'Atendidos',
    'Eventos',
    'Inscripciones',
    'Ocupación',
    'Participantes',
    'Pendientes',
] as const;

export type SectionId = (typeof SECTIONS)[number]['id'];
export type GroupId = (typeof GROUP_ORDER)[number];
