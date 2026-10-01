import { create } from 'zustand';
import { dayKey } from '@/features/events/lib/events';

export interface MonthCursor {
    year: number;
    // 0-11, como Date.
    month: number;
}

// Mes actual según la hora de Madrid.
export const currentMonth = (): MonthCursor => {
    const [year, month] = dayKey(new Date().toISOString())
        .split('-')
        .map(Number);

    return { year: year!, month: month! - 1 };
};

interface EventsState {
    cursor: MonthCursor;
    setCursor: (cursor: MonthCursor) => void;
}

// El mes visible se conserva al salir de la agenda y volver.
export const useEventsStore = create<EventsState>((set) => ({
    cursor: currentMonth(),
    setCursor: (cursor) => set({ cursor }),
}));
