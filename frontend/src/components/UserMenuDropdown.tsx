import { Fragment } from 'react';
import { ChevronDown } from 'lucide-react';
import { NavLink } from 'react-router';
import { useAuth } from '@/features/auth/hooks/context';
import { ROLE_IDS } from '@/features/users/lib/roles';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserAvatar } from '@/components/UserAvatar';
import { appRoutes, canAccess } from '@/routes/routes';
import {
    ADMIN_SEPARATOR_BEFORE,
    GESTION_SEPARATOR_BEFORE,
} from '@/components/navSeparators';

// Menú del avatar como popover. Alternativa a UserMenuSheet (el mismo menú
// como offcanvas): Header monta uno de los dos.
export const UserMenuDropdown = () => {
    const { user, logout } = useAuth();

    if (!user) return null;

    const gestionRoutes = appRoutes.filter(
        (route) =>
            route.group === 'gestion' && canAccess(route, user.permissions),
    );
    const estadisticasRoutes = appRoutes.filter(
        (route) =>
            route.group === 'estadisticas' &&
            canAccess(route, user.permissions),
    );
    const adminRoutes = appRoutes.filter(
        (route) =>
            route.group === 'admin' && canAccess(route, user.permissions),
    );

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <button
                        type="button"
                        className="ml-auto flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 hover:bg-black/10"
                    >
                        <UserAvatar user={user} />
                        <div className="hidden max-w-56 text-right text-sm leading-tight sm:block">
                            <p className="truncate font-medium">
                                {user.name} {user.lastName}
                            </p>
                            <p className="truncate text-brand-ink/80">
                                {user.roleName}
                            </p>
                        </div>
                        <ChevronDown className="hidden size-4 shrink-0 sm:block" />
                    </button>
                }
            />
            <DropdownMenuContent align="end">
                <DropdownMenuItem
                    className="cursor-pointer"
                    render={<NavLink to="/perfil">Mi perfil</NavLink>}
                />
                {user.roleId === ROLE_IDS.AIL && (
                    <DropdownMenuItem
                        className="cursor-pointer"
                        render={<NavLink to="/mis-eventos">Mis eventos</NavLink>}
                    />
                )}
                {(gestionRoutes.length > 0 ||
                    adminRoutes.length > 0 ||
                    user.roleId === ROLE_IDS.AIL) && <DropdownMenuSeparator />}
                {gestionRoutes.length > 0 && (
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="cursor-pointer">
                            Gestión
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                            {gestionRoutes.map((route) => (
                                <Fragment key={route.path}>
                                    {GESTION_SEPARATOR_BEFORE.has(
                                        route.path,
                                    ) && <DropdownMenuSeparator />}
                                    <DropdownMenuItem
                                        className="cursor-pointer"
                                        render={
                                            <NavLink to={route.path}>
                                                {route.label}
                                            </NavLink>
                                        }
                                    />
                                </Fragment>
                            ))}
                        </DropdownMenuSubContent>
                    </DropdownMenuSub>
                )}
                {estadisticasRoutes.map((route) => (
                    <DropdownMenuItem
                        key={route.path}
                        className="cursor-pointer"
                        render={
                            <NavLink to={route.path}>{route.label}</NavLink>
                        }
                    />
                ))}
                {adminRoutes.length > 0 && (
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="cursor-pointer">
                            Administración
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                            {adminRoutes.map((route) => (
                                <Fragment key={route.path}>
                                    {ADMIN_SEPARATOR_BEFORE.has(
                                        route.path,
                                    ) && <DropdownMenuSeparator />}
                                    <DropdownMenuItem
                                        className="cursor-pointer"
                                        render={
                                            <NavLink to={route.path}>
                                                {route.label}
                                            </NavLink>
                                        }
                                    />
                                </Fragment>
                            ))}
                        </DropdownMenuSubContent>
                    </DropdownMenuSub>
                )}
                {(gestionRoutes.length > 0 || adminRoutes.length > 0) && (
                    <DropdownMenuSeparator />
                )}
                <DropdownMenuItem
                    variant="destructive"
                    className="cursor-pointer"
                    onClick={() => void logout()}
                >
                    Cerrar sesión
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
