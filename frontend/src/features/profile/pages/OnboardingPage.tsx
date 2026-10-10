import { useState } from 'react';
import { PageTitle } from '@/components/PageTitle';
import { useAuth } from '@/features/auth/hooks/context';
import { ProfileForm } from '@/features/profile/components/ProfileForm';
import { CategoryPreferencesSection } from '@/features/profile/components/CategoryPreferencesSection';
import { PUNTO_VUELA_MAX } from '@/features/profile/lib/profile';
import type { User } from '@/lib/api';

// Primer acceso: no se puede saltar; hasta completarlo no se ve el resto de la app.
export function OnboardingPage() {
    const { user, setUser } = useAuth();
    // Cuando el perfil ya se guardó pero falta el paso de categorías (solo AIL):
    // se guarda aquí en vez de llamar a setUser, para no saltar a la app todavía.
    const [pendingUser, setPendingUser] = useState<User | null>(null);

    if (!user) return null;

    if (pendingUser) {
        return (
            <section className="mx-auto w-full max-w-md rounded-xl border bg-white p-5 sm:p-8">
                <PageTitle>Completa tu perfil</PageTitle>
                <p className="mb-6 text-muted-foreground">
                    Un último paso: elige qué tipos de eventos te interesan.
                </p>
                <CategoryPreferencesSection
                    continueLabel="Continuar"
                    onContinue={() => setUser(pendingUser)}
                />
            </section>
        );
    }

    return (
        <section className="mx-auto w-full max-w-md rounded-xl border bg-white p-5 sm:p-8">
            <PageTitle>Completa tu perfil</PageTitle>
            <p className="mb-6 text-muted-foreground">
                Es tu primer acceso. Escribe tu nombre y apellidos y confirma tu
                Punto Vuela. Podrás cambiarlos cuando quieras desde «Mi perfil».
            </p>
            <ProfileForm
                user={user}
                // El nombre de la cuenta de Google suele ser el del Punto Vuela,
                // no el de la persona: va en Punto Vuela y el nombre lo escribe ella.
                initial={{
                    name: '',
                    lastName: '',
                    puntoVuela: user.name.slice(0, PUNTO_VUELA_MAX),
                    dinamizadorTitle: null,
                }}
                submitLabel="Continuar"
                showSuccess={false}
                layout="stack"
                onSaved={(updated) => {
                    if (updated.roleId === 'ail') {
                        setPendingUser(updated);
                    } else {
                        setUser(updated);
                    }
                }}
            />
        </section>
    );
}
