import { GoogleSignIn } from '@/components/GoogleSignIn';

export const LoginPage = () => {
    return (
        <section className="mx-auto w-full max-w-md rounded-xl border bg-brand-cream-soft p-5 text-center sm:p-8">
            <h1 className="mb-2 text-2xl font-semibold">Iniciar sesión</h1>
            <p className="mb-6 text-muted-foreground">
                Sólo pueden acceder cuentas de @puntosvuela.es
            </p>
            <GoogleSignIn />
        </section>
    );
};
