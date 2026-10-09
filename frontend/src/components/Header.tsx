import { useEffect } from 'react';
import { NavLink } from 'react-router';
import { useAuth } from '@/features/auth/hooks/context';
import logo from '@/assets/logo.svg';
import { cn } from '@/lib/utils';
import { appRoutes, canAccess } from '@/routes/routes';
import { UserMenuDropdown } from '@/components/UserMenuDropdown';
import { UserMenuSheet } from '@/components/UserMenuSheet';
import { useAppSettingsStore } from '@/features/appSettings/store';

const navClass = ({ isActive }: { isActive: boolean }) =>
    cn(
        'shrink-0 rounded-md px-3 py-2 text-sm font-medium',
        isActive ? 'bg-brand-ink text-white' : 'hover:bg-black/10',
    );

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
                        <img
                            src={logo}
                            alt=""
                            className="size-7 rounded-md"
                        />
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
            </div>
        </header>
    );
};
