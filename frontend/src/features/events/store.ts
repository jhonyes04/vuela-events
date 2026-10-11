import { create } from 'zustand';
import { dayKey } from '@/features/events/lib/events';

// 'YYYY-MM-DD' de hoy según la hora de Madrid.
export const today = (): string => dayKey(new Date().toISOString());

interface EventsState {
    // Día de referencia: ancla el mes visible.
    anchor: string;
    setAnchor: (anchor: string) => void;
}

// El mes visible se conserva al salir de la agenda y volver.
export const useEventsStore = create<EventsState>((set) => ({
    anchor: today(),
    setAnchor: (anchor) => set({ anchor }),
}));
