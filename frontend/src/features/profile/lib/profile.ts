import { api, type User } from '@/lib/api';

// Deben coincidir con los límites del servidor (que es quien manda).
export const NAME_MAX = 200;
export const PUNTO_VUELA_MAX = 120;
export const MIN_LENGTH = 2;

export interface PuntoVueloHints {
    label: string;
    placeholder: string;
    help: string | null;
}

// El DT no pertenece a un Punto Vuela concreto: indica su zona.
export const puntoVueloHints = (roleId: string): PuntoVueloHints =>
    roleId === 'ail'
        ? {
              label: 'Punto Vuela',
              placeholder: 'Localidad de Punto Vuela',
              help: null,
          }
        : {
              label: 'Rol y zona',
              placeholder: 'Zona o ámbito de trabajo',
              help: 'Indica tu rol y zona de trabajo; no hace falta un Punto Vuela concreto',
          };

export interface ProfileValues {
    name: string;
    lastName: string;
    puntoVuela: string;
}

// Igual que el servidor: recorta y colapsa los espacios internos.
export const cleanText = (value: string): string =>
    value.trim().replace(/\s+/g, ' ');

export const updateProfile = async (values: ProfileValues): Promise<User> => {
    const { user } = await api.patch<{ user: User }>('/profile', values);

    return user;
};
