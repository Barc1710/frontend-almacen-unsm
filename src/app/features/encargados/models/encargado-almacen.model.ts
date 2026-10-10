/**
 * Representación del Personal de Custodia de Almacén.
 * Refleja el contrato de EncargadoAlmacenResponse del backend.
 */
export interface EncargadoAlmacen {
  readonly id: number;
  readonly nombres: string;
  readonly apellidos: string;
  readonly nombreCompleto?: string;
  readonly dni?: string | null;
  readonly estado?: string;
  readonly esTitular: boolean;
}

/**
 * Payload para registro y actualización de Encargado de Almacén.
 * Refleja el contrato de EncargadoAlmacenRequest del backend.
 */
export interface EncargadoAlmacenRequest {
  nombres: string;
  apellidos: string;
  dni?: string | null;
  esTitular?: boolean;
}

/**
 * Parámetros para consulta paginada y filtrado de personal de almacén.
 */
export interface EncargadoAlmacenFiltros {
  filtro?: string;
  page?: number;
  size?: number;
  sort?: string;
}
