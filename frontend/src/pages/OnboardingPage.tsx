import { useAuth } from '@/auth/context';
import { ProfileForm } from '@/components/ProfileForm';
import { PUNTO_VUELA_MAX } from '@/lib/profile';

// Primer acceso: no se puede saltar; hasta completarlo no se ve el resto de la app.
export function OnboardingPage() {
    const { user, setUser } = useAuth();

    if (!user) return null;

    return (
        <section className="mx-auto w-full max-w-md rounded-xl border bg-brand-cream-soft p-5 sm:p-8">
            <h1 className="mb-2 text-2xl font-semibold">Completa tu perfil</h1>
            <p className="mb-6 text-muted-foreground">
                Es tu primer acceso. Escribe tu nombre y apellidos y confirma
                tu Punto Vuela. Podrás cambiarlos cuando quieras desde «Mi
                perfil».
            </p>
            <ProfileForm
                user={user}
                // El nombre de la cuenta de Google suele ser el del Punto Vuela,
                // no el de la persona: va en Punto Vuela y el nombre lo escribe ella.
                initial={{
                    name: '',
                    puntoVuela: user.name.slice(0, PUNTO_VUELA_MAX),
                }}
                submitLabel="Continuar"
                showSuccess={false}
                onSaved={setUser}
            />
        </section>
    );
}
