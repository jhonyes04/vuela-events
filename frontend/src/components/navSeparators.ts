// Compartido entre UserMenuDropdown, UserMenuSheet y el hamburger de Header:
// antes de qué ruta va una línea separadora en los grupos Gestión/Administración.
export const GESTION_SEPARATOR_BEFORE = new Set([
    '/gestion/categorias',
    '/gestion/guias',
    '/gestion/plantillas-correo',
]);

export const ADMIN_SEPARATOR_BEFORE = new Set([
    '/admin/correo',
    '/admin/auditoria',
]);
