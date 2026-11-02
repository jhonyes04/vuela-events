import { useState } from 'react';

// Selección múltiple por id, con soporte de "seleccionar toda la página"
// (quien llama calcula `allPagedSelected` con su propio extractor de id,
// porque varía: log.id, rowKey(row), etc.)
export const useBulkSelection = () => {
    const [selected, setSelected] = useState<Set<string>>(new Set());

    const toggleOne = (id: string) => {
        setSelected((prev) => {
            const next = new Set(prev);

            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }

            return next;
        });
    };

    const toggleAllPaged = (pagedIds: string[], allPagedSelected: boolean) => {
        setSelected((prev) => {
            const next = new Set(prev);

            if (allPagedSelected) {
                pagedIds.forEach((id) => next.delete(id));
            } else {
                pagedIds.forEach((id) => next.add(id));
            }

            return next;
        });
    };

    // Tras borrar: quita del set solo los que se borraron de verdad.
    const removeFromSelection = (ids: string[]) => {
        setSelected((prev) => {
            const next = new Set(prev);

            ids.forEach((id) => next.delete(id));

            return next;
        });
    };

    return {
        selected,
        setSelected,
        toggleOne,
        toggleAllPaged,
        removeFromSelection,
    };
};
