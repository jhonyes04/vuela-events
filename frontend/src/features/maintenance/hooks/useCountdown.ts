import { useEffect, useState } from 'react';

export interface CountdownParts {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
}

const toParts = (ms: number): CountdownParts => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));

    return {
        days: Math.floor(totalSeconds / 86_400),
        hours: Math.floor((totalSeconds % 86_400) / 3_600),
        minutes: Math.floor((totalSeconds % 3_600) / 60),
        seconds: totalSeconds % 60,
    };
};

export const useCountdown = (target: string | null): CountdownParts | null => {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        if (!target) return;

        const id = setInterval(() => setNow(Date.now()), 1000);

        return () => clearInterval(id);
    }, [target]);

    if (!target) return null;

    const diff = new Date(target).getTime() - now;

    return diff > 0 ? toParts(diff) : null;
};

export interface MaintenanceCountdown {
    label: 'starting' | 'ending';
    parts: CountdownParts;
}

// Cuenta atrás hacia el próximo hito: si 'from' es futuro, cuenta hasta que
// empiece; si no, cuenta hasta 'to'. null si no hay nada pendiente.
export const useMaintenanceCountdown = (
    from: string | null,
    to: string | null,
): MaintenanceCountdown | null => {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        if (!from && !to) return;

        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, [from, to]);

    const fromMs = from ? new Date(from).getTime() : null;
    const toMs = to ? new Date(to).getTime() : null;

    if (fromMs !== null && fromMs > now) {
        return { label: 'starting', parts: toParts(fromMs - now) };
    }

    if (toMs !== null && toMs > now) {
        return { label: 'ending', parts: toParts(toMs - now) };
    }

    return null;
};
