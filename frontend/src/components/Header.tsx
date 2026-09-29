import { NavLink } from 'react-router';
import { useAuth } from '@/features/auth/hooks/context';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import logo from '@/assets/logo.svg';
import { cn } from '@/lib/utils';
import { appRoutes, canAccess } from '@/routes/routes';
import { ChevronDown } from 'lucide-react';

const navClass = ({ isActive }: { isActive: boolean }) =>
    cn(
        'shrink-0 rounded-md px-3 py-2 text-sm font-medium',
        isActive ? 'bg-brand-ink text-white' : 'hover:bg-black/10',
    );

export const Header = () => {
    const { user, logout } = useAuth();
    const showNav = user?.profileCompleted === true;
    const isAdmin = user?.roleId === 'admin';

    const mainRoutes = appRoutes.filter(
        (route) => !route.group && user && canAccess(route, user.permissions),
    );

    const adminRoutes = appRoutes.filter(
        (route) =>
            route.group === 'admin' &&
            isAdmin &&
            user &&
            canAccess(route, user.permissions),
    );

    return (
        // En móvil: marca y "Cerrar sesión" arriba, menú debajo (desplazable si no cabe).
        <header className="sticky top-0 z-40 bg-brand-yellow text-brand-ink shadow-sm">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2">
                <span className="flex items-center gap-2 text-xl font-semibold tracking-tight">
                    <img src={logo} alt="" className="size-7 rounded-md" />
                    Vuela Events
                </span>

                {user && showNav && (
                    <nav
                        aria-label="Principal"
                        className="order-3 -mx-1 flex w-full gap-1 overflow-x-auto sm:order-2 sm:mx-0 sm:w-auto sm:flex-1"
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

                        {adminRoutes.length > 0 && (
                            <DropdownMenu>
                                <DropdownMenuTrigger
                                    render={
                                        <button
                                            type="button"
                                            className="flex shrink-0 items-center gap-1 rounded-md px-3 py-2 text-sm font-medium hover:bg-black/10"
                                        >
                                            Administración
                                            <ChevronDown className="size-4" />
                                        </button>
                                    }
                                />
                                <DropdownMenuContent align="start">
                                    {adminRoutes.map((route) => (
                                        <DropdownMenuItem
                                            key={route.path}
                                            render={
                                                <NavLink to={route.path}>
                                                    {route.label}
                                                </NavLink>
                                            }
                                        />
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </nav>
                )}

                {user && (
                    <div className="order-2 ml-auto flex items-center gap-3 sm:order-3">
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
