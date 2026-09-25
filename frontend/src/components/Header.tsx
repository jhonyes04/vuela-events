import { NavLink } from 'react-router';
import { useAuth } from '@/auth/context';
import { Button } from '@/components/ui/button';
import type { Role } from '@/lib/api';
import { cn } from '@/lib/utils';
import { appRoutes, canAccess } from '@/routes/routes';

const ROLE_LABEL: Record<Role, string> = {
    admin: 'Administrador',
    dt: 'DT',
    ail: 'AIL',
};

const navClass = ({ isActive }: { isActive: boolean }) =>
    cn(
        'rounded-md px-3 py-2 text-sm font-medium',
        isActive ? 'bg-brand-ink text-white' : 'hover:bg-black/10',
    );

export const Header = () => {
    const { user, logout } = useAuth();

    return (
        <header className="bg-brand-yellow text-brand-ink">
            <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
                <div className="flex items-center gap-6">
                    <span className="text-xl font-semibold tracking-tight">
                        Vuela Events
                    </span>
                    {user && (
                        <nav aria-label="Principal" className="flex gap-1">
                            {appRoutes
                                .filter((route) => canAccess(route, user.role))
                                .map((route) => (
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
                {user && (
                    <div className="flex items-center gap-3">
                        <div className="hidden text-right text-sm leading-tight sm:block">
                            <p className="font-medium">{user.name}</p>
                            <p className="text-brand-ink/80">
                                {ROLE_LABEL[user.role]}
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
