import { useAuth } from '@/features/auth/hooks/context';
import { ProfileForm } from '@/features/profile/components/ProfileForm';
import { AppPasswordSection } from '@/features/profile/components/AppPasswordSection';

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
                    <dd>{user.roleName}</dd>
                </div>
            </dl>

            <div className="mb-6 rounded-xl border bg-card p-4 sm:p-6">
                <ProfileForm
                    user={user}
                    submitLabel="Guardar cambios"
                    showSuccess
                    onSaved={setUser}
                />
            </div>

            {user.permissions.includes('email:send') && (
                <div className="rounded-xl border bg-card p-4 sm:p-6">
                    <AppPasswordSection
                        user={user}
                        onSaved={(configured) =>
                            setUser({
                                ...user,
                                smtpAppPasswordConfigured: configured,
                            })
                        }
                    />
                </div>
            )}
        </section>
    );
}
