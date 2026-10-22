import type { Document } from '@/features/resources/lib/documents';
import type { ResourceLink } from '@/features/resources/lib/resourceLinks';

export type ResourceKind = 'document' | 'link';

export interface ResourceRow {
    id: string;
    kind: ResourceKind;
    title: string;
    active: boolean;
    inUse: boolean;
    createdById: string | null;
    detail: string;
    document?: Document;
    link?: ResourceLink;
}

export interface Pending {
    rows: ResourceRow[];
    label: string;
}

export type SortKey = 'title' | 'kind';
export type KindFilter = '' | ResourceKind;

export const KIND_FILTER_LABELS: Record<KindFilter, string> = {
    '': 'Todos los tipos',
    document: 'Documentos',
    link: 'Enlaces',
};

export const formatSize = (bytes: number): string =>
    bytes < 1024 * 1024
        ? `${Math.round(bytes / 1024)} KB`
        : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
