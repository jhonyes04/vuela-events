// 'Pueblo Nuevo Axarquía (Ana Vanesa García López)'; sin Punto Vuela, solo el nombre.
export const personLabel = (person: {
    name: string;
    puntoVuela: string | null;
}): string =>
    person.puntoVuela ? `${person.puntoVuela} (${person.name})` : person.name;
