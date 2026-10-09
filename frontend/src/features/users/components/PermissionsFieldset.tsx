import {
    BarChart3,
    BookOpen,
    CalendarDays,
    FolderOpen,
    History,
    Mail,
    ShieldCheck,
    SlidersHorizontal,
    Tag,
    UserPlus,
    Users,
    type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PermissionOption {
    id: string;
    description: string;
}

interface PermissionsFieldsetProps {
    permissions: PermissionOption[];
    checked: Set<string>;
    onToggle: (id: string, checked: boolean) => void | Promise<void>;
    disabled?: boolean;
}

interface CategoryStyle {
    label: string;
    icon: LucideIcon;
}

// Mismo estilo neutro para todas las categorías: solo cambian el icono y la etiqueta.
const CATEGORY_STYLES: Record<string, CategoryStyle> = {
    events: { label: 'Eventos', icon: CalendarDays },
    attendees: { label: 'Asistencia', icon: UserPlus },
    categories: { label: 'Categorías', icon: Tag },
    guides: { label: 'Guías', icon: BookOpen },
    email: { label: 'Correo', icon: Mail },
    users: { label: 'Usuarios', icon: Users },
    roles: { label: 'Roles', icon: ShieldCheck },
    resources: { label: 'Recursos', icon: FolderOpen },
    stats: { label: 'Estadísticas', icon: BarChart3 },
    audit: { label: 'Auditoría', icon: History },
    settings: { label: 'Configuración', icon: SlidersHorizontal },
};

const FALLBACK_STYLE: CategoryStyle = {
    label: '',
    icon: ShieldCheck,
};

// 'events:edit' -> 'events'
const categoryOf = (permissionId: string): string =>
    permissionId.split(':')[0] ?? permissionId;

export const PermissionsFieldset = ({
    permissions,
    checked,
    onToggle,
    disabled,
}: PermissionsFieldsetProps) => {
    const groups = new Map<string, PermissionOption[]>();

    for (const p of permissions) {
        const category = categoryOf(p.id);

        groups.set(category, [...(groups.get(category) ?? []), p]);
    }

    const totalChecked = permissions.filter((p) => checked.has(p.id)).length;

    return (
        <div className="grid gap-3">
            <div className="flex items-center justify-between">
                <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
                    Permisos
                </p>
                <Badge variant="outline">
                    {totalChecked} / {permissions.length} seleccionados
                </Badge>
            </div>

            <div className="grid grid-cols-1 gap-3">
                {[...groups.entries()].map(([category, items]) => {
                    const style = CATEGORY_STYLES[category] ?? {
                        ...FALLBACK_STYLE,
                        label: category,
                    };
                    const Icon = style.icon;
                    const allChecked = items.every((p) => checked.has(p.id));

                    return (
                        <fieldset
                            key={category}
                            className="grid gap-2 rounded-xl border p-3"
                        >
                            <legend className="sr-only">{style.label}</legend>

                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted">
                                        <Icon className="size-4 text-muted-foreground" />
                                    </span>
                                    <span className="font-medium">
                                        {style.label}
                                    </span>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={disabled}
                                    onClick={() => {
                                        void (async () => {
                                            for (const p of items) {
                                                await onToggle(
                                                    p.id,
                                                    !allChecked,
                                                );
                                            }
                                        })();
                                    }}
                                >
                                    {allChecked ? 'Ninguno' : 'Todos'}
                                </Button>
                            </div>

                            <div className="grid gap-1">
                                {items.map((p) => {
                                    const isChecked = checked.has(p.id);

                                    return (
                                        <label
                                            key={p.id}
                                            className={cn(
                                                'flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-sm',
                                                isChecked
                                                    ? 'bg-brand-yellow/15'
                                                    : 'hover:bg-muted',
                                            )}
                                        >
                                            <span>{p.description}</span>
                                            <input
                                                type="checkbox"
                                                className="size-4 shrink-0 accent-brand-yellow"
                                                checked={isChecked}
                                                disabled={disabled}
                                                onChange={(e) =>
                                                    onToggle(
                                                        p.id,
                                                        e.target.checked,
                                                    )
                                                }
                                            />
                                        </label>
                                    );
                                })}
                            </div>
                        </fieldset>
                    );
                })}
            </div>
        </div>
    );
};
