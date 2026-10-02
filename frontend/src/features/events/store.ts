import { create } from 'zustand';
import { dayKey } from '@/features/events/lib/events';

export type CalendarView = 'month' | 'week';

// 'YYYY-MM-DD' de hoy según la hora de Madrid.
export const today = (): string => dayKey(new Date().toISOString());

interface EventsState {
    view: CalendarView;
    // Día de referencia: ancla tanto la vista de mes (su mes) como la de
    // semana (su semana).
    anchor: string;
    setView: (view: CalendarView) => void;
    setAnchor: (anchor: string) => void;
}

// La vista y el día visibles se conservan al salir de la agenda y volver.
export const useEventsStore = create<EventsState>((set) => ({
    view: 'month',
    anchor: today(),
    setView: (view) => set({ view }),
    setAnchor: (anchor) => set({ anchor }),
}));
