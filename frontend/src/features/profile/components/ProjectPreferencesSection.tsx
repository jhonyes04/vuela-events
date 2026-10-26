import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api';
import { extractLockedSection } from '@/lib/html';
import {
    getProjectPreferences,
    listProjectOptions,
    setProjectPreferences,
    type ProjectOption,
} from '@/features/profile/lib/profile';
import {
    getUserProjectPreferences,
    setUserProjectPreferences,
} from '@/features/users/lib/users';
import { getProjectColorChip } from '@/features/projects/lib/colors';
import { cn } from '@/lib/utils';

interface ProjectPreferencesSectionProps {
    continueLabel?: string;
    onContinue?: () => void;
    userId?: string;
    deferred?: boolean;
    onSelectionChange?: (ids: string[]) => void;
}

export const ProjectPreferencesSection = ({
    continueLabel = 'Continuar',
    onContinue,
    userId,
    deferred = false,
    onSelectionChange,
}: ProjectPreferencesSectionProps = {}) => {
    const [options, setOptions] = useState<ProjectOption[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [savingId, setSavingId] = useState<string | null>(null);

    useEffect(() => {
        const loadMine = userId
            ? getUserProjectPreferences(userId)
            : getProjectPreferences();
        Promise.all([listProjectOptions(), loadMine])
            .then(([all, mine]) => {
                setOptions(all);
                setSelected(new Set(mine.map((c) => c.id)));
            })
            .catch(() => setFailed(true))
            .finally(() => setLoading(false));
    }, [userId]);

    const toggle = async (id: string) => {
        const next = new Set(selected);

        if (next.has(id)) next.delete(id);
        else next.add(id);

        if (deferred) {
            setSelected(next);
            onSelectionChange?.([...next]);

            return;
        }

        const previous = selected;
        setSelected(next);
        setSavingId(id);

        try {
            if (userId) await setUserProjectPreferences(userId, [...next]);
            else await setProjectPreferences([...next]);
        } catch (e) {
            setSelected(previous);
            toast.error(
                e instanceof ApiError
                    ? e.message
                    : 'No se pudo guardar la preferencia',
            );
        } finally {
            setSavingId(null);
        }
    };

    return (
        <div className="grid gap-4">
            <div className="grid gap-1">
                <h2 className="text-sm font-medium">
                    Tipos de eventos en los que te gustaría participar
                </h2>
                <p className="text-sm text-muted-foreground">
                    Marca los proyectos que te interesan. Es solo una referencia
                    para quien organiza los eventos.
                </p>
            </div>

            {loading ? (
                <p role="status" className="text-sm text-muted-foreground">
                    Cargando proyectos…
                </p>
            ) : failed ? (
                <p className="text-sm text-destructive">
                    No se pudieron cargar los proyectos.
                </p>
            ) : options.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    Todavía no hay proyectos de eventos.
                </p>
            ) : (
                <div className="grid gap-2">
                    {options.map((option) => {
                        const isChecked = selected.has(option.id);
                        const chip = getProjectColorChip(option.color);
                        const description = option.openingInstructions
                            ? extractLockedSection(
                                  option.openingInstructions,
                                  'Observaciones:',
                              )
                            : null;

                        return (
                            <button
                                key={option.id}
                                type="button"
                                aria-pressed={isChecked}
                                disabled={savingId === option.id}
                                onClick={() => void toggle(option.id)}
                                className={cn(
                                    'cursor-pointer rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                                    isChecked
                                        ? chip.className
                                        : 'border text-muted-foreground hover:bg-muted',
                                )}
                                style={isChecked ? chip.style : undefined}
                            >
                                <span className="block">{option.name}</span>
                                {description && (
                                    <span className="mt-0.5 block text-[11px] font-normal opacity-80">
                                        {description}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}

            {onContinue && (
                <div className="flex justify-end">
                    <Button type="button" onClick={onContinue}>
                        {continueLabel}
                    </Button>
                </div>
            )}
        </div>
    );
};
