import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api';
import {
    getCategoryPreferences,
    listCategoryOptions,
    setCategoryPreferences,
    type CategoryOption,
} from '@/features/profile/lib/profile';
import {
    getUserCategoryPreferences,
    setUserCategoryPreferences,
} from '@/features/users/lib/users';
import { categoryChipClass } from '@/features/categories/lib/colors';

interface CategoryPreferencesSectionProps {
    continueLabel?: string;
    onContinue?: () => void;
    userId?: string;
}

export const CategoryPreferencesSection = ({
    continueLabel = 'Continuar',
    onContinue,
    userId,
}: CategoryPreferencesSectionProps = {}) => {
    const [options, setOptions] = useState<CategoryOption[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [savingId, setSavingId] = useState<string | null>(null);

    useEffect(() => {
        const loadMine = userId
            ? getUserCategoryPreferences(userId)
            : getCategoryPreferences();
        Promise.all([listCategoryOptions(), loadMine])
            .then(([all, mine]) => {
                setOptions(all);
                setSelected(new Set(mine.map((c) => c.id)));
            })
            .catch(() => setFailed(true))
            .finally(() => setLoading(false));
    }, [userId]);

    const toggle = async (id: string) => {
        const previous = selected;
        const next = new Set(selected);

        if (next.has(id)) next.delete(id);
        else next.add(id);

        setSelected(next);
        setSavingId(id);

        try {
            if (userId) {
                await setUserCategoryPreferences(userId, [...next]);
            } else {
                await setCategoryPreferences([...next]);
            }
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
                    Marca las categorías que te interesan. Es solo una
                    referencia para quien organiza los eventos.
                </p>
            </div>

            {loading ? (
                <p role="status" className="text-sm text-muted-foreground">
                    Cargando categorías…
                </p>
            ) : failed ? (
                <p className="text-sm text-destructive">
                    No se pudieron cargar las categorías.
                </p>
            ) : options.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    Todavía no hay categorías de eventos.
                </p>
            ) : (
                <div className="flex flex-wrap gap-2">
                    {options.map((option) => {
                        const isChecked = selected.has(option.id);

                        return (
                            <button
                                key={option.id}
                                type="button"
                                aria-pressed={isChecked}
                                disabled={savingId === option.id}
                                onClick={() => void toggle(option.id)}
                                className={`cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                                    isChecked
                                        ? categoryChipClass(option.color)
                                        : 'border text-muted-foreground hover:bg-muted'
                                }`}
                            >
                                {option.name}
                            </button>
                        );
                    })}
                </div>
            )}

            {onContinue && (
                <div className="flex justify-center sm:justify-end">
                    <Button type="button" onClick={onContinue}>
                        {continueLabel}
                    </Button>
                </div>
            )}
        </div>
    );
};
