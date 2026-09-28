import { GoogleSignIn } from '@/components/GoogleSignIn';
import logo from '@/assets/logo.svg';

export const LoginPage = () => {
    return (
        <section className="mx-auto w-full max-w-sm rounded-2xl border-t-4 border-t-brand-yellow bg-brand-cream-soft p-6 text-center shadow-lg ring-1 ring-black/5 sm:p-8">
            <img
                src={logo}
                alt=""
                className="mx-auto mb-4 size-14 rounded-xl"
            />
            <h1 className="mb-1 text-2xl font-semibold">Iniciar sesión</h1>
            <p className="mb-6 text-sm text-muted-foreground">
                Sólo pueden acceder cuentas de @puntosvuela.es
            </p>
            <GoogleSignIn />
        </section>
    );
};
