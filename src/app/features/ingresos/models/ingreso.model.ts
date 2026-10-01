import { Articulo } from '../../articulos/models';

/**
 * Representación de un proveedor registrado en el catálogo institucional.
 */
export interface Proveedor {
  readonly id: number;
  readonly ruc?: string | null;
  readonly numeroDocumento?: string | null;
  readonly razonSocial: string;
  readonly nombreComercial?: string | null;
  readonly direccion?: string | null;
  readonly telefono?: string | null;
  readonly email?: string | null;
  readonly activo?: boolean;
  readonly estado?: string;
}

/**
 * Resumen de un comprobante de ingreso a almacén para la grilla principal.
 */
export interface Ingreso {
  readonly id: number;
  readonly numeroOrden: string; // Representa el N° de Ingreso (ej. I26-0001)
  readonly numeroCompleto?: string | null;
  readonly prefijo?: string | null;
  readonly correlativo?: number | null;
  readonly numeroOrdenCompra?: string | null;
  readonly idProveedor: number;
  readonly nombreProveedor?: string | null;
  readonly rucProveedor?: string | null;
  readonly fecha: string;
  readonly idUsuario?: number | null;
  readonly usuarioRecepcion?: string | null;
  readonly nombreUsuario?: string | null;
  readonly totalItems?: number;
  readonly totalArticulos?: number;
  readonly totalImporte?: number;
  readonly total?: number;
  readonly observacion?: string | null;
  readonly estado?: string;
  readonly fechaCreacion?: string;
}

/**
 * Detalle individual de un artículo recepcionado en un ingreso.
 */
export interface IngresoDetalle {
  readonly id?: number;
  readonly idArticulo: number;
  readonly codigoArticulo?: string;
  readonly descripcionArticulo?: string;
  readonly simboloUnidadMedida?: string | null;
  readonly permiteDecimales?: boolean | null;
  readonly cantidad: number;
  readonly precioUnitario: number;
  readonly subtotal: number;
}

/**
 * Comprobante de ingreso completo con su colección de artículos recepcionados.
 */
export interface IngresoConDetalles extends Ingreso {
  readonly detalles: IngresoDetalle[];
}

/**
 * DTO para registrar un ítem de detalle en la solicitud de creación de ingreso.
 */
export interface IngresoDetalleRequest {
  readonly idArticulo: number;
  readonly cantidad: number;
  readonly precioUnitario: number;
}

/**
 * DTO de solicitud para el registro transaccional de un nuevo ingreso.
 */
export interface IngresoCreateRequest {
  readonly idProveedor: number;
  readonly numeroOrden: string;
  readonly fecha: string;
  readonly observacion?: string | null;
  readonly detalles: IngresoDetalleRequest[];
}

/**
 * Filtros de búsqueda y paginación para la bandeja de ingresos.
 */
export interface IngresoFiltros {
  filtro?: string;
  numeroOrden?: string;
  idProveedor?: number | null;
  fechaInicio?: string;
  fechaFin?: string;
  desde?: string;
  hasta?: string;
  page?: number;
  size?: number;
  sort?: string;
}

/**
 * Type guard para validar si un objeto corresponde a un Proveedor.
 */
export function isProveedor(value: unknown): value is Proveedor {
  if (typeof value !== 'object' || value === null) return false;
  const cand = value as Record<string, unknown>;
  return (
    typeof cand['id'] === 'number' &&
    (typeof cand['razonSocial'] === 'string' || typeof cand['nombre'] === 'string')
  );
}

/**
 * Type guard para validar si un objeto corresponde a un Ingreso.
 */
export function isIngreso(value: unknown): value is Ingreso {
  if (typeof value !== 'object' || value === null) return false;
  const cand = value as Record<string, unknown>;
  return (
    typeof cand['id'] === 'number' &&
    (typeof cand['numeroOrden'] === 'string' || typeof cand['ordenCompra'] === 'string')
  );
}

/**
 * Type guard para validar si un objeto corresponde a un IngresoConDetalles.
 */
export function isIngresoConDetalles(value: unknown): value is IngresoConDetalles {
  return isIngreso(value) && Array.isArray((value as unknown as Record<string, unknown>)['detalles']);
}
