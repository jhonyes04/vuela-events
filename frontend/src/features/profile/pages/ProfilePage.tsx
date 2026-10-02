import { Mail } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/UserAvatar';
import { useAuth } from '@/features/auth/hooks/context';
import { ProfileForm } from '@/features/profile/components/ProfileForm';
import { AppPasswordSection } from '@/features/profile/components/AppPasswordSection';
import { SignatureSection } from '@/features/profile/components/SignatureSection';
import { MyEventsSection } from '@/features/profile/components/MyEventsSection';

export const ProfilePage = () => {
    const { user, setUser } = useAuth();

    if (!user) return null;

    const canSendEmail = user.permissions.includes('email:send');

    return (
        <section className="mx-auto grid w-full max-w-5xl gap-6">
            <div className="overflow-hidden rounded-2xl border bg-card">
                <div className="h-24 bg-brand-ink/90 sm:h-32" />
                <div className="flex flex-col gap-4 px-4 pb-6 sm:flex-row sm:items-end sm:px-6">
                    <UserAvatar
                        user={user}
                        className="-mt-12 size-24 text-2xl ring-4 sm:-mt-16 sm:size-32 sm:text-4xl"
                    />
                    <div className="grid gap-1">
                        <h1 className="text-2xl font-semibold">
                            {user.name} {user.lastName}
                        </h1>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            <Badge>{user.roleName}</Badge>
                            <span className="flex items-center gap-1.5 break-all">
                                <Mail className="size-4 shrink-0" />
                                {user.email}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid gap-6">
                <div className="rounded-xl border bg-card p-4 sm:p-6">
                    <ProfileForm
                        user={user}
                        submitLabel="Guardar cambios"
                        showSuccess
                        onSaved={setUser}
                    />
                </div>

                {canSendEmail && (
                    <>
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
                        <div className="rounded-xl border bg-card p-4 sm:p-6">
                            <SignatureSection
                                user={user}
                                onSaved={(configured) =>
                                    setUser({
                                        ...user,
                                        signatureConfigured: configured,
                                    })
                                }
                            />
                        </div>
                    </>
                )}
            </div>
            <div className="rounded-xl border bg-card p-4 sm:p-6">
                <MyEventsSection />
            </div>
        </section>
    );
};
