/**
 * Representa la respuesta de una Marca de artículos devuelta por el backend.
 * Mapea exactamente pe.edu.unsm.almacen.dto.response.MarcaResponse
 */
export interface MarcaResponse {
  readonly id: number;
  readonly nombre: string;
  readonly estado: string;
}

/** Alias para conveniencia de tipado en vistas y tablas */
export type Marca = MarcaResponse;

/**
 * Payload requerido para la creación y actualización de una Marca.
 * Mapea exactamente pe.edu.unsm.almacen.dto.request.MarcaRequest
 */
export interface MarcaRequest {
  readonly nombre: string;
}

/**
 * Parámetros de consulta y paginación para el listado de marcas.
 */
export interface MarcaFiltros {
  filtro?: string;
  page?: number;
  size?: number;
  sort?: string;
}
