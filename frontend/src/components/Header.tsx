import { useAuth } from '@/auth/context';
import { Button } from '@/components/ui/button';
import type { Role } from '@/lib/api';

const ROLE_LABEL: Record<Role, string> = {
    admin: 'Administrador',
    dt: 'DT',
    ail: 'AIL',
};

export const Header = () => {
    const { user, logout } = useAuth();

    return (
        <header className="bg-brand-yellow text-brand-ink">
            <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
                <span className="text-xl font-semibold tracking-tight">
                    Vuela Events
                </span>

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
