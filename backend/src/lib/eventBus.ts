import { EventEmitter } from 'node:events';

// Emisor en memoria: avisa cuando cambian los inscritos de un evento.
// Un solo proceso Node (Coolify sin escalar horizontal) -> vale sin Redis.
export const registrationBus = new EventEmitter();

// Sin límite cada cliente con la ficha abierta añade uno y se limpia solo al cerrar
registrationBus.setMaxListeners(0);

const CALENDAR_CHANNEL = 'calendar';

export const emitCalendarChanged = (): void => {
    registrationBus.emit(CALENDAR_CHANNEL);
};

export const emitRegistrationChanged = (eventId: string): void => {
    registrationBus.emit(eventId);
    emitCalendarChanged();
};
