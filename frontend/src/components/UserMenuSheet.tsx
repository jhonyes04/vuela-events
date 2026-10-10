import {
    BarChart3,
    BookOpen,
    Calendar,
    CalendarCheck,
    History,
    LogOut,
    Mail,
    Settings,
    Monitor,
    ShieldCheck,
    SlidersHorizontal,
    FolderKanban,
    UserIcon,
    UserCog,
    Users,
    XIcon,
    type LucideIcon,
} from 'lucide-react';
import { NavLink } from 'react-router';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import { useAuth } from '@/features/auth/hooks/context';
import { ROLE_IDS } from '@/features/users/lib/roles';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetTrigger,
} from '@/components/ui/sheet';
import { UserAvatar } from '@/components/UserAvatar';
import { cn } from '@/lib/utils';
import { scrollbarOptions } from '@/lib/overlayScrollbarsOptions';
import { appRoutes, canAccess, type AppRoute } from '@/routes/routes';

// Un icono por ruta, para que cada opción del menú se reconozca de un vistazo.
const ROUTE_ICONS: Record<string, LucideIcon> = {
    '/gestion/eventos': Calendar,
    '/gestion/proyectos': FolderKanban,
    '/gestion/intereses': Users,
    '/gestion/guias': BookOpen,
    '/gestion/plantillas-correo': Mail,
    '/estadisticas': BarChart3,
    '/admin/usuarios': UserCog,
    '/admin/roles': ShieldCheck,
    '/admin/correo': Settings,
    '/admin/auditoria': History,
    '/admin/ajustes': SlidersHorizontal,
    '/admin/sesiones': Monitor,
};

const navClass = ({ isActive }: { isActive: boolean }) =>
    cn(
        'flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
        isActive ? 'bg-brand-yellow text-brand-ink' : 'hover:bg-white/10',
    );

const panelClass = 'grid gap-1 rounded-xl bg-white/5 p-2';

interface RouteGroupProps {
    label: string;
    routes: AppRoute[];
}

const RouteGroup = ({ label, routes }: RouteGroupProps) => {
    if (routes.length === 0) return null;

    return (
        <div className={panelClass}>
            <p className="px-2 pb-1 text-xs font-bold tracking-wide text-white/50 uppercase">
                {label}
            </p>
            {routes.map((route) => {
                const Icon = ROUTE_ICONS[route.path];

                return (
                    <SheetClose
                        key={route.path}
                        nativeButton={false}
                        render={
                            <NavLink to={route.path} className={navClass}>
                                {Icon && <Icon className="size-4" />}
                                {route.label}
                            </NavLink>
                        }
                    />
                );
            })}
        </div>
    );
};

// Menú del avatar como offcanvas desde la derecha. Alternativa a
// UserMenuDropdown (el mismo menú como popover): Header monta uno de los dos.
export const UserMenuSheet = () => {
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
        <Sheet>
            <SheetTrigger
                render={
                    <button
                        type="button"
                        className="ml-auto flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 hover:bg-black/10 hover:text-white"
                    >
                        <UserAvatar user={user} />
                        <div className="hidden max-w-56 text-right text-sm leading-tight sm:block">
                            <p className="truncate font-medium text-brand-ink">
                                {user.name} {user.lastName}
                            </p>
                            <p className="truncate text-brand-ink/80">
                                {user.roleName}
                            </p>
                        </div>
                    </button>
                }
            />
            <SheetContent
                side="right"
                showCloseButton={false}
                className="border-l-black/20 bg-gradient-to-b from-neutral-900 to-neutral-800 text-white shadow-2xl"
            >
                <SheetClose
                    render={
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            className="absolute top-3 right-3 z-10 rounded-full bg-yellow-300 text-black shadow-md transition-all duration-200 hover:scale-110 active:scale-95 hover:bg-yellow-200 hover:text-black"
                        />
                    }
                >
                    <XIcon />
                    <span className="sr-only">Cerrar</span>
                </SheetClose>

                <OverlayScrollbarsComponent
                    className="min-h-0 flex-1"
                    options={scrollbarOptions}
                    defer
                >
                    <div className="grid gap-3 p-4 pt-12">
                        <nav aria-label="Cuenta" className="grid gap-2">
                            <div className={panelClass}>
                                <SheetClose
                                    nativeButton={false}
                                    render={
                                        <NavLink
                                            to="/perfil"
                                            className={navClass}
                                        >
                                            <UserIcon className="size-4" />
                                            Mi perfil
                                        </NavLink>
                                    }
                                />
                                {user.roleId === ROLE_IDS.AIL && (
                                    <SheetClose
                                        nativeButton={false}
                                        render={
                                            <NavLink
                                                to="/mis-eventos"
                                                className={navClass}
                                            >
                                                <CalendarCheck className="size-4" />
                                                Mis eventos
                                            </NavLink>
                                        }
                                    />
                                )}
                            </div>

                            <RouteGroup
                                label="Gestión"
                                routes={gestionRoutes}
                            />

                            {estadisticasRoutes.length > 0 && (
                                <div className={panelClass}>
                                    {estadisticasRoutes.map((route) => {
                                        const Icon = ROUTE_ICONS[route.path];

                                        return (
                                            <SheetClose
                                                key={route.path}
                                                nativeButton={false}
                                                render={
                                                    <NavLink
                                                        to={route.path}
                                                        className={navClass}
                                                    >
                                                        {Icon && (
                                                            <Icon className="size-4" />
                                                        )}
                                                        {route.label}
                                                    </NavLink>
                                                }
                                            />
                                        );
                                    })}
                                </div>
                            )}

                            <RouteGroup
                                label="Administración"
                                routes={adminRoutes}
                            />
                        </nav>

                        <Button
                            className="mt-2 justify-start gap-2 rounded-xl bg-red-400 text-black hover:bg-red-700 hover:text-white"
                            onClick={() => void logout()}
                        >
                            <LogOut className="size-4" />
                            Cerrar sesión
                        </Button>
                    </div>
                </OverlayScrollbarsComponent>
            </SheetContent>
        </Sheet>
    );
};
