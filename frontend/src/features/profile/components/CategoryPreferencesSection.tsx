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
    submitLabel?: string;
    // Se llama tras guardar con éxito (p. ej. para avanzar al siguiente paso del onboarding).
    onSaved?: () => void;
    userId?: string;
}

export const CategoryPreferencesSection = ({
    submitLabel = 'Guardar',
    onSaved,
    userId,
}: CategoryPreferencesSectionProps = {}) => {
    const [options, setOptions] = useState<CategoryOption[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [submitting, setSubmitting] = useState(false);

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

    const toggle = (id: string) => {
        setSelected((prev) => {
            const next = new Set(prev);

            if (next.has(id)) next.delete(id);
            else next.add(id);

            return next;
        });
    };

    const handleSave = async () => {
        setSubmitting(true);

        try {
            if (userId) {
                await setUserCategoryPreferences(userId, [...selected]);
            } else {
                await setCategoryPreferences([...selected]);
            }

            toast.success('Preferencias guardadas.');
            onSaved?.();
        } catch (e) {
            toast.error(
                e instanceof ApiError
                    ? e.message
                    : 'No se pudieron guardar las preferencias',
            );
        } finally {
            setSubmitting(false);
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
                                onClick={() => toggle(option.id)}
                                className={`cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
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

            <div className="flex justify-center sm:justify-end">
                <Button
                    type="button"
                    disabled={loading || failed || submitting}
                    onClick={() => void handleSave()}
                >
                    {submitting ? 'Guardando…' : submitLabel}
                </Button>
            </div>
        </div>
    );
};
