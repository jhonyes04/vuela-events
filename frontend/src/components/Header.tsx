import { useEffect } from 'react';
import { CalendarRange, FolderOpen, type LucideIcon } from 'lucide-react';
import { NavLink } from 'react-router';
import { useAuth } from '@/features/auth/hooks/context';
import logo from '@/assets/logo.svg';
import { cn } from '@/lib/utils';
import { appRoutes, canAccess } from '@/routes/routes';
import { UserMenuDropdown } from '@/components/UserMenuDropdown';
import { UserMenuSheet } from '@/components/UserMenuSheet';
import { useAppSettingsStore } from '@/features/appSettings/store';
import { OnlineAvatars } from '@/features/onlineUsers/components/OnlineAvatars';

const navClass = ({ isActive }: { isActive: boolean }) =>
    cn(
        'shrink-0 flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium',
        isActive ? 'bg-brand-ink text-white' : 'hover:bg-black/10',
    );

// Mismos iconos que en el menú del avatar, para que Eventos/Recursos se
// reconozcan igual en el nav principal.
const MAIN_ROUTE_ICONS: Record<string, LucideIcon> = {
    '/': CalendarRange,
    '/recursos': FolderOpen,
};

export const Header = () => {
    const { user } = useAuth();
    const showNav = user?.profileCompleted === true;
    const userMenuStyle = useAppSettingsStore((s) => s.userMenuStyle);
    const loadAppSettings = useAppSettingsStore((s) => s.load);

    useEffect(() => {
        if (user) void loadAppSettings();
    }, [user, loadAppSettings]);

    const mainRoutes = appRoutes.filter(
        (route) =>
            !route.group &&
            route.path !== '/perfil' &&
            route.path !== '/mis-eventos' &&
            user &&
            canAccess(route, user.permissions),
    );

    return (
        <header className="sticky top-0 z-40 bg-brand-yellow text-brand-ink shadow-sm">
            <div className="mx-auto max-w-6xl px-4 py-2">
                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-2 text-xl font-semibold tracking-tight">
                        <img src={logo} alt="" className="size-7 rounded-md" />
                        Vuela Events
                    </span>

                    {user && showNav && (
                        <nav
                            aria-label="Principal"
                            className="hidden flex-1 items-center gap-1 overflow-x-auto sm:flex"
                        >
                            {mainRoutes.map((route) => {
                                const Icon = MAIN_ROUTE_ICONS[route.path];

                                return (
                                    <NavLink
                                        key={route.path}
                                        to={route.path}
                                        end={route.path === '/'}
                                        className={navClass}
                                    >
                                        {Icon && <Icon className="size-4" />}
                                        {route.label}
                                    </NavLink>
                                );
                            })}
                        </nav>
                    )}

                    {user && (
                        <div className="hidden lg:inline-block ms-auto">
                            <OnlineAvatars />
                        </div>
                    )}

                    {userMenuStyle === 'sheet' ? (
                        <UserMenuSheet />
                    ) : (
                        <UserMenuDropdown />
                    )}
                </div>

                {user && showNav && mainRoutes.length > 0 && (
                    <nav
                        aria-label="Principal"
                        className="flex items-center justify-center gap-1 overflow-x-auto pt-2 sm:hidden"
                    >
                        {mainRoutes.map((route) => {
                            const Icon = MAIN_ROUTE_ICONS[route.path];

                            return (
                                <NavLink
                                    key={route.path}
                                    to={route.path}
                                    end={route.path === '/'}
                                    className={navClass}
                                >
                                    {Icon && <Icon className="size-4" />}
                                    {route.label}
                                </NavLink>
                            );
                        })}
                    </nav>
                )}
            </div>
        </header>
    );
};
