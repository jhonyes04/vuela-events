import { describe, expect, it } from 'vitest';
import { personLabel } from './personLabel';

describe('personLabel', () => {
    it('Punto Vuela y, entre paréntesis, el nombre', () => {
        expect(
            personLabel({
                name: 'Ana Vanesa García López',
                puntoVuela: 'Pueblo Nuevo Axarquía',
            }),
        ).toBe('Pueblo Nuevo Axarquía (Ana Vanesa García López)');
    });

    it('sin Punto Vuela, solo el nombre', () => {
        expect(personLabel({ name: 'Ana García', puntoVuela: null })).toBe(
            'Ana García',
        );
    });
});
