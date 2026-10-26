import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { ComboboxField } from '@/components/ComboboxField';
import { personLabel } from '@/lib/personLabel';
import {
    listOwnerCandidates,
    type OwnerCandidate,
} from '@/lib/ownerCandidates';

interface OwnerFieldOwner {
    id: string;
    name: string;
    puntoVuela: string | null;
}

interface OwnerFieldProps {
    value: string;
    onValueChange: (value: string) => void;
    disabled?: boolean;
    // El propietario real actual del item: se muestra siempre, aunque no
    // sea un candidato seleccionable (p. ej. es admin y quien edita es dt).
    currentOwner?: OwnerFieldOwner | null;
}

// Solo se usa cuando quien edita tiene el permiso: deja fijar al propietario
// real cuando el item se da de alta o edita en nombre de otro usuario.
export const OwnerField = ({
    value,
    onValueChange,
    disabled,
    currentOwner,
}: OwnerFieldProps) => {
    // null mientras carga: el combobox no se monta hasta tener los
    // candidatos, para no mostrar el id en bruto si el actual no resuelve.
    const [candidates, setCandidates] = useState<OwnerCandidate[] | null>(
        null,
    );

    useEffect(() => {
        listOwnerCandidates()
            .then(setCandidates)
            .catch(() => setCandidates([]));
    }, []);

    if (candidates === null) {
        return (
            <div className="grid gap-1.5">
                <Label htmlFor="owner-field">Propietario</Label>
                <p className="text-sm text-muted-foreground">Cargando…</p>
            </div>
        );
    }

    // El propietario actual no está entre los candidatos (es admin y quien
    // edita no lo es): no se puede reasignar, ni siquiera a uno mismo.
    const currentOwnerIsLocked =
        !!currentOwner && !candidates.some((c) => c.id === currentOwner.id);

    const items = currentOwnerIsLocked ? [currentOwner] : candidates;

    return (
        <div className="grid gap-1.5">
            <Label htmlFor="owner-field">Propietario</Label>
            <ComboboxField
                id="owner-field"
                disabled={disabled || currentOwnerIsLocked}
                items={items}
                getValue={(candidate) => candidate.id}
                getLabel={(candidate) => personLabel(candidate)}
                value={value}
                onValueChange={onValueChange}
                placeholder="Tú mismo"
                emptyMessage="No hay usuarios disponibles"
            />
        </div>
    );
};
