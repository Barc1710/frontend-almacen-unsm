import { isPageResponse, PageResponse } from '../../core/models/api-response.model';

export interface Cliente {
  readonly id?: string | number;
  readonly dni?: string | number | null;
  readonly nombre?: string | null;
  readonly nombres?: string | null;
  readonly apellidos?: string | null;
  readonly direccion?: string | null;
  readonly telefono?: string | null;
  readonly correo?: string | null;
  readonly estado?: string | null;
}

export interface NuevoCliente {
  readonly dni: string;
  readonly nombre: string;
  readonly direccion: string;
  readonly telefono: string;
  readonly correo: string;
}

export function esDniValido(numero: string): boolean {
  return /^\d{8}$/.test(numero);
}

export const MAX_VISIBLE_PAGES = 5;

export function getPageIndicators(
  totalPages: number,
  currentPage: number,
): (number | 'ellipsis')[] {
  if (totalPages <= 0) {
    return [];
  }

  if (totalPages <= MAX_VISIBLE_PAGES) {
    return Array.from({ length: totalPages }, (_, index) => index);
  }

  const windowStart = Math.min(Math.max(currentPage - 1, 0), totalPages - 3);
  const windowEnd = windowStart + 2;
  const pages: (number | 'ellipsis')[] = [];

  if (windowStart > 0) {
    pages.push(0);
  }
  if (windowStart > 1) {
    pages.push('ellipsis');
  }

  for (let index = windowStart; index <= windowEnd; index++) {
    pages.push(index);
  }

  if (windowEnd < totalPages - 1) {
    pages.push('ellipsis');
    pages.push(totalPages - 1);
  }

  return pages;
}

export function isClientePage(value: unknown): value is PageResponse<Cliente> {
  if (!isPageResponse<unknown>(value)) {
    return false;
  }

  return value.content.every(isCliente);
}

function isCliente(value: unknown): value is Cliente {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const cliente = value as Record<string, unknown>;
  return (
    isOptionalIdentifier(cliente['id']) &&
    isIdentifier(cliente['dni']) &&
    isOptionalText(cliente['nombre']) &&
    isOptionalText(cliente['nombres']) &&
    isOptionalText(cliente['apellidos']) &&
    isOptionalText(cliente['direccion']) &&
    isOptionalText(cliente['telefono']) &&
    isOptionalText(cliente['correo']) &&
    isOptionalText(cliente['estado'])
  );
}

function isOptionalIdentifier(value: unknown): value is string | number | null | undefined {
  return (
    value === undefined || value === null || typeof value === 'string' || typeof value === 'number'
  );
}

function isIdentifier(value: unknown): value is string | number {
  return typeof value === 'string' || typeof value === 'number';
}

function isOptionalText(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === 'string';
}
