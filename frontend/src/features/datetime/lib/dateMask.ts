// 'YYYY-MM-DD' -> Date local (evita el desfase de parsear como UTC).
export const parseDateKey = (key: string): Date | undefined => {
    const [year, month, day] = key.split('-').map(Number);

    if (!year || !month || !day) return undefined;

    return new Date(year, month - 1, day);
};

// Date local -> 'YYYY-MM-DD'
export const formatDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
};

// Date local -> 'dd/mm/yyyy', lo que se ve y se teclea.
export const formatDisplay = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');

    return `${day}/${month}/${date.getFullYear()}`;
};

// 'dd/mm/yyyy' -> Date local, o undefined si no es una fecha válida real
// (rechaza cosas como 31/02/2026, que Date() "redondearía" a marzo).
export const parseDisplay = (text: string): Date | undefined => {
    const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());

    if (!match) return undefined;

    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    const date = new Date(year, month - 1, day);

    return date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
        ? date
        : undefined;
};

// Inserta las barras solas a partir de los dígitos tecleados: "19082026" ->
// "19/08/2026". Deja pasar lo que ya tenga barras (al borrar, por ejemplo).
export const autoFormatDateInput = (raw: string): string => {
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    let out = digits.slice(0, 2);

    if (digits.length > 2) out += '/' + digits.slice(2, 4);
    if (digits.length > 4) out += '/' + digits.slice(4, 8);

    return out;
};
