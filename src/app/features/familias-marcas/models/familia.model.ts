/**
 * Representa la respuesta de una Familia de artículos devuelta por el backend.
 * Mapea exactamente pe.edu.unsm.almacen.dto.response.FamiliaResponse
 */
export interface FamiliaResponse {
  readonly id: number;
  readonly nombre: string;
  readonly inicial: string;
  readonly correlativo: number;
  readonly estado: string;
}

/** Alias para conveniencia de tipado en vistas y tablas */
export type Familia = FamiliaResponse;

/**
 * Payload requerido para la creación y actualización de una Familia.
 * Mapea exactamente pe.edu.unsm.almacen.dto.request.FamiliaRequest
 */
export interface FamiliaRequest {
  readonly nombre: string;
  readonly inicial?: string | null;
}

/**
 * Parámetros de consulta y paginación para el listado de familias.
 */
export interface FamiliaFiltros {
  filtro?: string;
  page?: number;
  size?: number;
  sort?: string;
}
