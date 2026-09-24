const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

let pending: Promise<void> | null = null;

// Carga el script de Google una sola vez aunque varios componentes lo pidan.
export const loadGoogleScript = (): Promise<void> => {
    if (window.google?.accounts.id) {
        return Promise.resolve();
    }

    pending ??= new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');

        script.src = GOOGLE_SCRIPT_SRC;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => {
            pending = null;
            script.remove();
            reject(
                new Error('No se pudo cargar el inicio de sesión de Google'),
            );
        };

        document.head.append(script);
    });

    return pending;
};
