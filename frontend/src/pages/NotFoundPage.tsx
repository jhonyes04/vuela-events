import { Link } from 'react-router';

export const NotFoundPage = () => {
    return (
        <section className="text-center">
            <h1 className="mb-2 text-2xl font-semibold">
                Página no encontrada
            </h1>
            <Link to="/" className="underline underline-offset-4">
                Volver al inicio
            </Link>
        </section>
    );
};
