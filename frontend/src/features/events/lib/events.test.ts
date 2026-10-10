import { describe, expect, it } from 'vitest';
import {
    dayKey,
    formatFullDate,
    formatMonthLabel,
    formatTime,
    groupByDay,
    madridLocalToIso,
    MAX_OCCURRENCES,
    personLabel,
    previewRecurrence,
    type EventItem,
} from './events';

const event = (id: string, startsAt: string): EventItem => ({
    id,
    title: id,
    subtitle: null,
    description: null,
    location: null,
    startsAt,
    endsAt: startsAt,
    capacity: null,
    participantsCount: null,
    participantsObservations: null,
    seriesId: null,
    createdAt: startsAt,
    createdBy: { id: 'u', name: 'U', puntoVuela: null },
    project: { id: 'c', name: 'Proyecto', color: 'amber' },
    guide: { id: 'g', name: 'Guía', url: 'https://example.com' },
    _count: { registrations: 0 },
    registered: false,
});

describe('madridLocalToIso', () => {
    it.each([
        ['2026-09-23T09:00', '2026-09-23T07:00:00.000Z', 'verano (UTC+2)'],
        ['2026-09-23T13:00', '2026-09-23T11:00:00.000Z', 'verano (UTC+2)'],
        ['2026-12-15T10:00', '2026-12-15T09:00:00.000Z', 'invierno (UTC+1)'],
        ['2026-10-01T00:30', '2026-09-30T22:30:00.000Z', 'medianoche'],
        [
            '2026-10-25T10:00',
            '2026-10-25T09:00:00.000Z',
            'día del cambio a invierno',
        ],
        [
            '2026-03-29T10:00',
            '2026-03-29T08:00:00.000Z',
            'día del cambio a verano',
        ],
    ])('%s -> %s (%s)', (input, expected) => {
        expect(madridLocalToIso(input)).toBe(expected);
    });
});

describe('formateadores en hora de Madrid', () => {
    it('un instante de madrugada UTC cae en el día siguiente en Madrid', () => {
        expect(dayKey('2026-09-30T22:30:00.000Z')).toBe('2026-10-01');
        expect(formatTime('2026-09-30T22:30:00.000Z')).toBe('00:30');
    });

    it('etiquetas de mes y de fecha completa en español', () => {
        expect(formatMonthLabel(2026, 8)).toBe('Septiembre de 2026');
        expect(formatFullDate('2027-01-06')).toBe('6 de enero de 2027');
    });
});

describe('groupByDay', () => {
    it('agrupa por día de Madrid y ordena los días', () => {
        const groups = groupByDay([
            event('c', '2026-10-01T09:00:00.000Z'),
            event('a', '2026-09-23T07:00:00.000Z'),
            event('b', '2026-09-23T15:00:00.000Z'),
            // 22:30Z de septiembre ya es el 1 de octubre en Madrid.
            event('d', '2026-09-30T22:30:00.000Z'),
        ]);

        expect(groups.map((g) => g.key)).toEqual(['2026-09-23', '2026-10-01']);
        expect(groups[0]!.events.map((e) => e.id)).toEqual(['a', 'b']);
        expect(groups[1]!.events.map((e) => e.id)).toEqual(['c', 'd']);
    });
});

describe('previewRecurrence', () => {
    it('52 miércoles de 2027, con primera y última fecha', () => {
        expect(previewRecurrence('2027-01-01', '2027-12-31', [3])).toEqual({
            count: 52,
            first: '2027-01-06',
            last: '2027-12-29',
            overLimit: false,
        });
    });

    it('varios días de la semana', () => {
        expect(
            previewRecurrence('2027-01-01', '2027-01-31', [1, 3])?.count,
        ).toBe(8);
    });

    it('sin datos suficientes o rango invertido: null', () => {
        expect(previewRecurrence('', '2027-01-31', [3])).toBeNull();
        expect(previewRecurrence('2027-01-01', '2027-01-31', [])).toBeNull();
        expect(previewRecurrence('2027-02-01', '2027-01-01', [3])).toBeNull();
    });

    it('ningún día coincide: 0 sesiones', () => {
        expect(previewRecurrence('2027-01-07', '2027-01-07', [3])?.count).toBe(
            0,
        );
    });

    it('supera el máximo o el rango permitido: overLimit', () => {
        const every = previewRecurrence(
            '2027-01-01',
            '2027-12-31',
            [1, 2, 3, 4, 5, 6, 7],
        );

        expect(every?.overLimit).toBe(true);
        expect(every!.count).toBeGreaterThan(MAX_OCCURRENCES);
        expect(
            previewRecurrence('2027-01-01', '2099-12-31', [3])?.overLimit,
        ).toBe(true);
    });
});

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
