import { Fragment } from 'react';
import { Menu } from 'lucide-react';
import { NavLink } from 'react-router';
import { useAuth } from '@/features/auth/hooks/context';
import { Button } from '@/components/ui/button';
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
import { UserMenuSheet } from '@/components/UserMenuSheet';
import {
    ADMIN_SEPARATOR_BEFORE,
    GESTION_SEPARATOR_BEFORE,
} from '@/components/navSeparators';

const navClass = ({ isActive }: { isActive: boolean }) =>
    cn(
        'shrink-0 rounded-md px-3 py-2 text-sm font-medium',
        isActive ? 'bg-brand-ink text-white' : 'hover:bg-black/10',
    );

interface RouteDropdownProps {
    label: string;
    routes: AppRoute[];
    separatorBefore?: Set<string>;
}

// En vertical dentro del offcanvas (con etiqueta de grupo en vez de
// desplegable, que en un panel ya no hace falta).
const MobileRouteGroup = ({
    label,
    routes,
    separatorBefore,
}: RouteDropdownProps) => {
    if (routes.length === 0) return null;

    return (
        <div className="grid gap-1">
            <p className="px-3 pt-2 text-xs font-bold tracking-wide text-muted-foreground uppercase">
                {label}
            </p>
            {routes.map((route) => (
                <Fragment key={route.path}>
                    {separatorBefore?.has(route.path) && (
                        <div className="h-px bg-black/10" />
                    )}
                    <SheetClose
                        nativeButton={false}
                        render={
                            <NavLink to={route.path} className={navClass}>
                                {route.label}
                            </NavLink>
                        }
                    />
                </Fragment>
            ))}
        </div>
    );
};

export const Header = () => {
    const { user } = useAuth();
    const showNav = user?.profileCompleted === true;

    const mainRoutes = appRoutes.filter(
        (route) =>
            !route.group &&
            route.path !== '/perfil' &&
            user &&
            canAccess(route, user.permissions),
    );

    const gestionRoutes = appRoutes.filter(
        (route) =>
            route.group === 'gestion' &&
            user &&
            canAccess(route, user.permissions),
    );

    // Estadísticas va aparte, justo debajo de Gestión.
    const estadisticasRoutes = appRoutes.filter(
        (route) =>
            route.group === 'estadisticas' &&
            user &&
            canAccess(route, user.permissions),
    );

    const adminRoutes = appRoutes.filter(
        (route) =>
            route.group === 'admin' &&
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
                                    separatorBefore={GESTION_SEPARATOR_BEFORE}
                                />
                                {estadisticasRoutes.map((route) => (
                                    <SheetClose
                                        key={route.path}
                                        nativeButton={false}
                                        render={
                                            <NavLink
                                                to={route.path}
                                                className={navClass}
                                            >
                                                {route.label}
                                            </NavLink>
                                        }
                                    />
                                ))}
                                <MobileRouteGroup
                                    label="Administración"
                                    routes={adminRoutes}
                                    separatorBefore={ADMIN_SEPARATOR_BEFORE}
                                />
                            </nav>
                        </SheetContent>
                    </Sheet>
                )}

                <UserMenuSheet />
            </div>
        </header>
    );
};
