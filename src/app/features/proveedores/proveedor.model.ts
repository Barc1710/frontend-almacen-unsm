import { isPageResponse, PageResponse } from '../../core/models/api-response.model';

export interface Proveedor {
  readonly id?: string | number;
  readonly ruc?: string | number | null;
  readonly razonSocial?: string | null;
  readonly direccion?: string | null;
  readonly telefono?: string | null;
  readonly correo?: string | null;
  readonly contacto?: string | null;
  readonly banco?: string | null;
  readonly cuentaCorriente?: string | null;
  readonly estado?: string | null;
}

export interface NuevoProveedor {
  readonly ruc: string;
  readonly razonSocial: string;
  readonly direccion?: string;
  readonly telefono?: string;
  readonly correo?: string;
  readonly contacto?: string;
  readonly banco?: string;
  readonly cuentaCorriente?: string;
}

export function esRucValido(numero: string): boolean {
  return /^\d{11}$/.test(numero);
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

export function isProveedorPage(value: unknown): value is PageResponse<Proveedor> {
  if (!isPageResponse<unknown>(value)) {
    return false;
  }

  return value.content.every(isProveedor);
}

function isProveedor(value: unknown): value is Proveedor {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const proveedor = value as Record<string, unknown>;
  return (
    isOptionalIdentifier(proveedor['id']) &&
    isIdentifier(proveedor['ruc']) &&
    isOptionalText(proveedor['razonSocial']) &&
    isOptionalText(proveedor['direccion']) &&
    isOptionalText(proveedor['telefono']) &&
    isOptionalText(proveedor['correo']) &&
    isOptionalText(proveedor['contacto']) &&
    isOptionalText(proveedor['banco']) &&
    isOptionalText(proveedor['cuentaCorriente']) &&
    isOptionalText(proveedor['estado'])
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
