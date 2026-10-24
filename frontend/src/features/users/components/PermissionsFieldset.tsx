import {
    BarChart3,
    BookOpen,
    CalendarDays,
    FolderOpen,
    History,
    Mail,
    ShieldCheck,
    SlidersHorizontal,
    Monitor,
    FolderKanban,
    UserPlus,
    Users,
    type LucideIcon,
    PackageOpen,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { PermissionOption } from '@/features/users/lib/roles';
import { cn } from '@/lib/utils';

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
    attendees: { label: 'Asistencia', icon: UserPlus },
    audit: { label: 'Auditoría', icon: History },
    email: { label: 'Correo', icon: Mail },
    events: { label: 'Eventos', icon: CalendarDays },
    guides: { label: 'Guías', icon: BookOpen },
    materials: { label: 'Materiales', icon: PackageOpen },
    projects: { label: 'Proyectos', icon: FolderKanban },
    resources: { label: 'Recursos', icon: FolderOpen },
    roles: { label: 'Roles', icon: ShieldCheck },
    sessions: { label: 'Sesiones', icon: Monitor },
    settings: { label: 'Configuración', icon: SlidersHorizontal },
    stats: { label: 'Estadísticas', icon: BarChart3 },
    users: { label: 'Usuarios', icon: Users },
};

// Orden de categorías tal como deben aparecer.
const CATEGORY_ORDER = [
    'events',
    'attendees',
    'projects',
    'guides',
    'resources',
    'materials',
    'email',
    'stats',
    'users',
    'roles',
    'audit',
    'settings',
    'sessions',
];

// Orden dentro de cada categoría: 'events:edit:own' -> acción 'edit:own'.
const ACTION_ORDER = [
    'view',
    'interests:view',
    'create',
    'backdate',
    'edit',
    'edit:own',
    'delete',
    'delete:own',
    'send',
    'send:convocatoria',
    'send:parte_firmas',
    'manage',
];

const categoryRank = (category: string): number => {
    const index = CATEGORY_ORDER.indexOf(category);

    return index === -1 ? CATEGORY_ORDER.length : index;
};

const actionRank = (permissionId: string, category: string): number => {
    const action = permissionId.slice(category.length + 1);
    const index = ACTION_ORDER.indexOf(action);

    return index === -1 ? ACTION_ORDER.length : index;
};

const FALLBACK_STYLE: CategoryStyle = {
    label: '',
    icon: ShieldCheck,
};

// 'events:edit' -> 'events'
const projectOf = (permissionId: string): string =>
    permissionId.split(':')[0] ?? permissionId;

export const PermissionsFieldset = ({
    permissions,
    checked,
    onToggle,
    disabled,
}: PermissionsFieldsetProps) => {
    const groups = new Map<string, PermissionOption[]>();

    for (const p of permissions) {
        const category = projectOf(p.id);

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
                {[...groups.entries()]
                    .sort(([a], [b]) => categoryRank(a) - categoryRank(b))
                    .map(([category, items]) => {
                        const style = CATEGORY_STYLES[category] ?? {
                            ...FALLBACK_STYLE,
                            label: category,
                        };
                        const Icon = style.icon;
                        const allChecked = items.every((p) =>
                            checked.has(p.id),
                        );
                        const sortedItems = [...items].sort(
                            (a, b) =>
                                actionRank(a.id, category) -
                                actionRank(b.id, category),
                        );

                        return (
                            <fieldset
                                key={category}
                                className="grid gap-2 rounded-xl border p-3"
                            >
                                <legend className="sr-only">
                                    {style.label}
                                </legend>

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
                                    {sortedItems.map((p) => {
                                        const isChecked = checked.has(p.id);

                                        return (
                                            <label
                                                key={p.id}
                                                className={cn(
                                                    'flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-sm',
                                                    isChecked
                                                        ? 'bg-primary/10'
                                                        : 'hover:bg-muted',
                                                )}
                                            >
                                                <span>{p.description}</span>
                                                <Checkbox
                                                    checked={isChecked}
                                                    disabled={disabled}
                                                    onCheckedChange={(
                                                        checked,
                                                    ) =>
                                                        onToggle(p.id, checked)
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
