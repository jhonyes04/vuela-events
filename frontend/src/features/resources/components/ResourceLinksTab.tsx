import { useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import { ListErrors } from '@/features/users/components/ListErrors';
import { useResourceLinksStore } from '@/features/resources/store';

interface ResourceLinksTabProps {
    search: string;
}

export const ResourceLinksTab = ({ search }: ResourceLinksTabProps) => {
    const links = useResourceLinksStore((s) => s.items);
    const loading = useResourceLinksStore((s) => s.loading);
    const error = useResourceLinksStore((s) => s.error);
    const load = useResourceLinksStore((s) => s.load);

    useEffect(() => {
        void load(true);
    }, [load]);

    const visibleLinks = links.filter((l) => l.active).filter((l) => {
        if (!search) return true;

        const q = search.trim().toLowerCase();

        return (
            l.title.toLowerCase().includes(q) || l.url.toLowerCase().includes(q)
        );
    });

    return (
        <div>
            <ListErrors
                error={error}
                actionError={null}
                onRetry={() => void load(true)}
            />

            {loading ? (
                <p role="status" className="text-muted-foreground">
                    Cargando recursos…
                </p>
            ) : visibleLinks.length === 0 ? (
                <p className="text-muted-foreground">Todavía no hay enlaces.</p>
            ) : (
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {visibleLinks.map((link) => {
                        return (
                            <li
                                key={link.id}
                                className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center"
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-medium">
                                        {link.title}
                                    </p>
                                    <a
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 truncate text-sm text-muted-foreground hover:underline"
                                    >
                                        <ExternalLink className="size-3.5 shrink-0" />
                                        <span className="truncate">
                                            {link.url}
                                        </span>
                                    </a>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};
