import { config } from '@/config';

const MAX_CONSECUTIVE_ERRORS = 5;

// Único punto que abre el stream SSE: así la lógica de reconexión no se
// duplica entre el hook (useNotificationStream) y el store compartido.
export const openNotificationStream = (onMessage: () => void): EventSource => {
    const source = new EventSource(`${config.apiBase}/notifications/stream`, {
        withCredentials: true,
    });

    let consecutiveErrors = 0;

    source.onopen = () => {
        consecutiveErrors = 0;
    };

    source.onmessage = () => onMessage();

    // Un corte de red reintenta solo (comportamiento nativo del navegador):
    // no cerramos ahí, para no perder notificaciones en vivo por un corte
    // breve. Solo si falla muchas veces seguidas (típico: sesión caducada,
    // el servidor devuelve 401 una y otra vez) dejamos de insistir.
    source.onerror = () => {
        consecutiveErrors += 1;

        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
            source.close();
        }
    };

    return source;
};
