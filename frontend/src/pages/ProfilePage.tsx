import { useAuth } from '@/auth/context';
import { ProfileForm } from '@/components/ProfileForm';
import type { Role } from '@/lib/api';

const ROLE_LABEL: Record<Role, string> = {
    admin: 'Administrador',
    dt: 'DT',
    ail: 'AIL',
};

export function ProfilePage() {
    const { user, setUser } = useAuth();

    if (!user) return null;

    return (
        <section className="mx-auto w-full max-w-xl">
            <h1 className="mb-6 text-2xl font-semibold">Mi perfil</h1>

            <dl className="mb-6 grid gap-3 rounded-xl border bg-card p-4 text-sm sm:grid-cols-2">
                <div className="grid gap-0.5">
                    <dt className="text-xs font-medium text-muted-foreground">
                        Correo
                    </dt>
                    <dd className="break-all">{user.email}</dd>
                </div>
                <div className="grid gap-0.5">
                    <dt className="text-xs font-medium text-muted-foreground">
                        Rol
                    </dt>
                    <dd>{ROLE_LABEL[user.role]}</dd>
                </div>
            </dl>

            <div className="rounded-xl border bg-card p-4 sm:p-6">
                <ProfileForm
                    user={user}
                    submitLabel="Guardar cambios"
                    showSuccess
                    onSaved={setUser}
                />
            </div>
        </section>
    );
}
