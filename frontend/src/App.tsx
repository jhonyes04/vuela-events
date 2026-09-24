import { useAuth } from '@/auth/context';
import { GoogleSignIn } from '@/components/GoogleSignIn';
import { Header } from '@/components/Header';

function LoginCard() {
    return (
        <section className="mx-auto max-w-md rounded-xl border bg-brand-cream-soft p-8 text-center">
            <h1 className="mb-2 text-2xl font-semibold">Inicia sesión</h1>
            <p className="mb-6 text-muted-foreground">
                Solo pueden acceder cuentas de @puntosvuela.es.
            </p>
            <GoogleSignIn />
        </section>
    );
}

export default function App() {
    const { user, loading } = useAuth();

    return (
        <div className="min-h-svh bg-background text-foreground">
            <Header />
            <main className="mx-auto max-w-6xl px-4 py-10">
                {loading ? (
                    <p role="status" className="text-muted-foreground">
                        Cargando…
                    </p>
                ) : user ? (
                    // Marcador: aquí irá el calendario de eventos.
                    <p>Sesión iniciada como {user.email}.</p>
                ) : (
                    <LoginCard />
                )}
            </main>
        </div>
    );
}
