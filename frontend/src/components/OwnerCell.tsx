import { personLabel } from '@/lib/personLabel';

interface OwnerCellOwner {
    id: string;
    name: string;
    puntoVuela: string | null;
}

interface OwnerCellProps {
    owner: OwnerCellOwner | null;
}

// Propietario en una tabla: texto "puntoVuela (nombre)", solo lectura. Se
// cambia desde el formulario de alta/edición del item, no desde aquí.
export const OwnerCell = ({ owner }: OwnerCellProps) => (
    <span>{owner ? personLabel(owner) : '—'}</span>
);
