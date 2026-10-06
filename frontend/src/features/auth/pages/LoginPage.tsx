import { useState } from 'react';
import { GoogleSignIn } from '@/features/auth/components/GoogleSignIn';
import logo from '@/assets/logo.svg';

export const LoginPage = () => {
    const [otherAccount, setOtherAccount] = useState(false);

    return (
        <section className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-3xl shadow-2xl ring-1 ring-black/5 md:grid-cols-2">
            {/* Izquierda: foto + efectos, solo en pantallas medianas o más. */}
            <div className="login-hero relative hidden min-h-[480px] flex-col justify-between overflow-hidden bg-brand-ink p-8 md:flex">
                <div className="pointer-events-none absolute -top-16 -left-16 size-64 rounded-full bg-brand-yellow/30 blur-3xl" />
                <div className="pointer-events-none absolute -right-10 bottom-10 size-72 rounded-full bg-brand-green/30 blur-3xl" />
                <div className="login-hero-dots pointer-events-none absolute inset-0 opacity-20" />

                <button
                    type="button"
                    onClick={() => setOtherAccount(true)}
                    aria-label="Entrar con una cuenta fuera de @puntosvuela.es"
                    className="relative w-fit rounded-xl transition-opacity hover:opacity-80"
                >
                    <img src={logo} alt="" className="size-12 rounded-xl" />
                </button>

                <div className="relative">
                    <h2 className="mb-2 text-3xl font-semibold text-white">
                        Vuela Events
                    </h2>
                    <p className="max-w-xs text-sm text-white/80">
                        Talleres y eventos de Puntos Vuela: consulta el
                        calendario, inscríbete y gestiona tu asistencia.
                    </p>
                </div>
            </div>

            {/* Derecha: formulario */}
            <div className="flex flex-col items-center justify-center gap-6 bg-brand-cream-soft p-8 text-center sm:p-12">
                <img
                    src={logo}
                    alt=""
                    className="size-12 rounded-xl md:hidden"
                />
                <div>
                    <h1 className="mb-1 text-2xl font-semibold">
                        Iniciar sesión
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Sólo pueden acceder cuentas de @puntosvuela.es
                    </p>
                </div>
                <GoogleSignIn otherAccount={otherAccount} />
            </div>
        </section>
    );
};
