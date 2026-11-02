// Rechaza caracteres de control (incluye null, bidi, etc.) y < > (evita HTML/tags)
// en texto libre de usuario (títulos, mensajes). Usado por events/profile/notifications.
export const NO_CONTROL_OR_TAGS = /^[^\p{C}<>]+$/u;

// Igual, pero permitiendo \n (texto multilínea: mensaje libre de notificaciones).
export const MULTILINE_NO_CONTROL_OR_TAGS = /^(?:[^\p{Cc}<>]|\n)+$/u;
