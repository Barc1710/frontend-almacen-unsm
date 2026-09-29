import { describe, expect, it } from 'vitest';
import { esDniValido, getPageIndicators, isClientePage } from './cliente.model';

describe('isClientePage', () => {
  it('acepta una página con clientes identificables por DNI', () => {
    expect(
      isClientePage({
        content: [{ dni: '12345678', nombre: 'Ana Cliente' }],
        number: 0,
        size: 10,
        totalElements: 1,
        totalPages: 1,
      }),
    ).toBe(true);
  });

  it('rechaza registros sin DNI para no mostrar datos inválidos', () => {
    expect(
      isClientePage({
        content: [{ nombre: 'Cliente sin documento' }],
        number: 0,
        size: 10,
        totalElements: 1,
        totalPages: 1,
      }),
    ).toBe(false);
  });

  it('propaga el rechazo cuando al menos un registro de la página es inválido', () => {
    expect(
      isClientePage({
        content: [{ dni: '12345678', nombre: 'Ana Cliente' }, { nombre: 'Sin DNI' }],
        number: 0,
        size: 10,
        totalElements: 2,
        totalPages: 1,
      }),
    ).toBe(false);
  });
});

describe('getPageIndicators', () => {
  it('muestra una ventana corta con la página actual y la última en listados de 89 clientes', () => {
    expect(getPageIndicators(9, 0)).toEqual([0, 1, 2, 'ellipsis', 8]);
  });

  it('mantiene visible una página cercana y permite saltar al inicio y al final en listados grandes', () => {
    expect(getPageIndicators(20, 4)).toEqual([0, 'ellipsis', 3, 4, 5, 'ellipsis', 19]);
  });

  it('ancla la ventana al final cuando el usuario navega a la última página', () => {
    expect(getPageIndicators(18, 17)).toEqual([0, 'ellipsis', 15, 16, 17]);
  });

  it('lista todas las páginas cuando el total es corto y no hace falta recortar', () => {
    expect(getPageIndicators(5, 2)).toEqual([0, 1, 2, 3, 4]);
    expect(getPageIndicators(0, 0)).toEqual([]);
  });
});

describe('esDniValido', () => {
  it('valida únicamente DNI peruanos de ocho dígitos', () => {
    expect(esDniValido('12345678')).toBe(true);
    expect(esDniValido('123456789')).toBe(false);
    expect(esDniValido('20123456789')).toBe(false);
    expect(esDniValido('1234abc8')).toBe(false);
    expect(esDniValido('')).toBe(false);
  });
});
