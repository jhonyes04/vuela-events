import { ChevronDown, Menu } from 'lucide-react';
import { NavLink } from 'react-router';
import { useAuth } from '@/features/auth/hooks/context';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import logo from '@/assets/logo.svg';
import { cn } from '@/lib/utils';
import { appRoutes, canAccess, type AppRoute } from '@/routes/routes';

const navClass = ({ isActive }: { isActive: boolean }) =>
    cn(
        'shrink-0 rounded-md px-3 py-2 text-sm font-medium',
        isActive ? 'bg-brand-ink text-white' : 'hover:bg-black/10',
    );

const dropdownTriggerClass =
    'flex shrink-0 items-center gap-1 rounded-md px-3 py-2 text-sm font-medium hover:bg-black/10';

interface RouteDropdownProps {
    label: string;
    routes: AppRoute[];
}

const RouteDropdown = ({ label, routes }: RouteDropdownProps) => {
    if (routes.length === 0) return null;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <button type="button" className={dropdownTriggerClass}>
                        {label}
                        <ChevronDown className="size-4" />
                    </button>
                }
            />
            <DropdownMenuContent
                align="start"
                className="w-max whitespace-nowrap"
            >
                {routes.map((route) => (
                    <DropdownMenuItem
                        key={route.path}
                        render={
                            <NavLink to={route.path}>{route.label}</NavLink>
                        }
                    />
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

// Mismos enlaces que RouteDropdown, pero en vertical dentro del offcanvas
// (con etiqueta de grupo en vez de desplegable, que en un panel ya no hace falta).
const MobileRouteGroup = ({ label, routes }: RouteDropdownProps) => {
    if (routes.length === 0) return null;

    return (
        <div className="grid gap-1">
            <p className="px-3 pt-2 text-xs font-bold tracking-wide text-muted-foreground uppercase">
                {label}
            </p>
            {routes.map((route) => (
                <SheetClose
                    key={route.path}
                    nativeButton={false}
                    render={
                        <NavLink to={route.path} className={navClass}>
                            {route.label}
                        </NavLink>
                    }
                />
            ))}
        </div>
    );
};

export const Header = () => {
    const { user, logout } = useAuth();
    const showNav = user?.profileCompleted === true;
    const isAdmin = user?.roleId === 'admin';

    const mainRoutes = appRoutes.filter(
        (route) => !route.group && user && canAccess(route, user.permissions),
    );

    const gestionRoutes = appRoutes.filter(
        (route) =>
            route.group === 'gestion' &&
            user &&
            canAccess(route, user.permissions),
    );

    const adminRoutes = appRoutes.filter(
        (route) =>
            route.group === 'admin' &&
            isAdmin &&
            user &&
            canAccess(route, user.permissions),
    );

    return (
        <header className="sticky top-0 z-40 bg-brand-yellow text-brand-ink shadow-sm">
            <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2">
                <span className="flex items-center gap-2 text-xl font-semibold tracking-tight">
                    <img src={logo} alt="" className="size-7 rounded-md" />
                    Vuela Events
                </span>

                {user && showNav && (
                    <nav
                        aria-label="Principal"
                        className="hidden flex-1 items-center gap-1 overflow-x-auto sm:flex"
                    >
                        {mainRoutes.map((route) => (
                            <NavLink
                                key={route.path}
                                to={route.path}
                                end={route.path === '/'}
                                className={navClass}
                            >
                                {route.label}
                            </NavLink>
                        ))}

                        <RouteDropdown label="Gestión" routes={gestionRoutes} />
                        <RouteDropdown
                            label="Administración"
                            routes={adminRoutes}
                        />
                    </nav>
                )}

                {user && showNav && (
                    <Sheet>
                        <SheetTrigger
                            render={
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label="Abrir menú"
                                    className="sm:hidden"
                                >
                                    <Menu className="size-5" />
                                </Button>
                            }
                        />
                        <SheetContent
                            side="left"
                            className="bg-brand-yellow text-brand-ink"
                        >
                            <SheetHeader>
                                <SheetTitle>Menú</SheetTitle>
                            </SheetHeader>
                            <nav
                                aria-label="Principal"
                                className="grid gap-1 px-4 pb-4"
                            >
                                {mainRoutes.map((route) => (
                                    <SheetClose
                                        key={route.path}
                                        nativeButton={false}
                                        render={
                                            <NavLink
                                                to={route.path}
                                                end={route.path === '/'}
                                                className={navClass}
                                            >
                                                {route.label}
                                            </NavLink>
                                        }
                                    />
                                ))}
                                <MobileRouteGroup
                                    label="Gestión"
                                    routes={gestionRoutes}
                                />
                                <MobileRouteGroup
                                    label="Administración"
                                    routes={adminRoutes}
                                />
                            </nav>
                        </SheetContent>
                    </Sheet>
                )}

                {user && (
                    <div className="ml-auto flex items-center gap-3">
                        <div className="hidden max-w-56 text-right text-sm leading-tight sm:block">
                            <p className="truncate font-medium">
                                {user.name} {user.lastName}
                            </p>
                            <p className="truncate text-brand-ink/80">
                                {user.roleName}
                            </p>
                        </div>
                        <Button size="lg" onClick={() => void logout()}>
                            Cerrar sesión
                        </Button>
                    </div>
                )}
            </div>
        </header>
    );
};
