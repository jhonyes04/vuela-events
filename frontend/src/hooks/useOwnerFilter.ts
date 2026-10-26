import { useState } from 'react';
import { personLabel } from '@/lib/personLabel';

interface Owner {
    id: string;
    name: string;
    puntoVuela: string | null;
}

// Candidatos del filtro: solo los propietarios que ya aparecen en la lista,
// no todos los usuarios elegibles (que ensuciarían el combobox).
export const useOwnerFilter = <T extends { createdBy: Owner | null }>(
    items: T[],
) => {
    const [ownerFilter, setOwnerFilter] = useState('');

    const owners = [
        ...new Map(
            items.flatMap((item) =>
                item.createdBy
                    ? [[item.createdBy.id, item.createdBy] as const]
                    : [],
            ),
        ).values(),
    ].sort((a, b) => personLabel(a).localeCompare(personLabel(b)));

    const ownerOptions: Owner[] = [
        { id: '', name: 'Todos los propietarios', puntoVuela: null },
        ...owners,
    ];

    const matchesOwner = (item: T) =>
        !ownerFilter || item.createdBy?.id === ownerFilter;

    return { ownerFilter, setOwnerFilter, ownerOptions, matchesOwner };
};
