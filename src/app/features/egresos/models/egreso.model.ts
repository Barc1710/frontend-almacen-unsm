/**
 * Tipos de egreso soportados según el dominio institucional de almacén UNSM.
 */
export type TipoEgreso = 'DESPACHO_ORDINARIO' | 'BAJA_DETERIORO' | 'BAJA_VENCIMIENTO';

/**
 * Cliente / destinatario solicitante de suministros.
 */
export interface Cliente {
  readonly id: number;
  readonly nombre: string;
  readonly dni?: string | null;
  readonly telefono?: string | null;
  readonly celular?: string | null;
  readonly correo?: string | null;
  readonly direccion?: string | null;
  readonly estado?: string;
}

/**
 * Dependencia o área universitaria de destino del despacho.
 */
export interface Area {
  readonly id: number;
  readonly nombre: string;
  readonly estado?: string;
}

/**
 * Encargado o funcionario institucional habilitado para recepcionar bienes.
 */
export interface Encargado {
  readonly id: number;
  readonly siglaProfesion?: string | null;
  readonly nombres: string;
  readonly apellidos: string;
  readonly nombreCompleto?: string | null;
  readonly dni?: string | null;
  readonly ambiente?: string | null;
  readonly estado?: string;
}

/**
 * Encargado oficial del almacén general (titular o suplente).
 */
export interface EncargadoAlmacen {
  readonly id: number;
  readonly nombre: string;
  readonly estado?: string;
  readonly esTitular: boolean;
  readonly cargo?: string | null;
}

/**
 * Comprobante oficial de egreso (despacho o acta de baja) para grilla principal.
 */
export interface Egreso {
  readonly id: number;
  readonly idCliente?: number | null;
  readonly nombreCliente?: string | null;
  readonly idEncargado?: number | null;
  readonly nombreEncargado?: string | null;
  readonly nombreEncargadoLibre?: string | null;
  readonly idArea?: number | null;
  readonly nombreArea?: string | null;
  readonly idEncargadoAlmacen: number;
  readonly nombreEncargadoAlmacen?: string | null;
  readonly idUsuario?: number | null;
  readonly nombreUsuario?: string | null;
  readonly ambiente?: string | null;
  readonly prefijo: string;
  readonly correlativo: number;
  readonly numeroCompleto: string; // ej. E26-0001
  readonly tipoEgreso: TipoEgreso | string;
  readonly motivoBaja?: string | null;
  readonly fecha: string;
  readonly estado: string; // "1": ACTIVO, "0": ANULADO
  readonly total: number;
  readonly totalItems?: number;
  readonly totalArticulos?: number;
  readonly detalles?: DetalleEgreso[];
}

/**
 * Detalle individual de un artículo despachado o dado de baja.
 */
export interface DetalleEgreso {
  readonly id?: number;
  readonly idArticulo: number;
  readonly codigoArticulo: string;
  readonly descripcionArticulo: string;
  readonly numeroOrdenCompra?: string | null;
  readonly cantidad: number;
  readonly precio: number;
  readonly subtotal: number;
  readonly saldo: number;
  readonly fecha?: string;
  readonly tipo?: string;
  readonly simboloUnidadMedida?: string | null;
  readonly permiteDecimales?: boolean | null;
}

/**
 * Comprobante de egreso completo con sus renglones de detalle cargados.
 */
export interface EgresoConDetalles extends Egreso {
  readonly detalles: DetalleEgreso[];
}

/**
 * DTO para cada línea de detalle en el payload de creación de egreso.
 */
export interface DetalleEgresoRequest {
  readonly idArticulo: number;
  readonly cantidad: number;
}

/**
 * DTO de solicitud para el registro transaccional de un nuevo despacho o baja.
 */
export interface EgresoCreateRequest {
  readonly idCliente?: number | null;
  readonly idEncargado?: number | null;
  readonly nombreEncargadoLibre?: string | null;
  readonly tipoEgreso: TipoEgreso;
  readonly motivoBaja?: string | null;
  readonly idArea?: number | null;
  readonly idEncargadoAlmacen: number;
  readonly ambiente?: string | null;
  readonly prefijo?: string | null;
  readonly detalles: DetalleEgresoRequest[];
}

/**
 * Filtros de consulta y paginación para la bandeja principal de egresos.
 */
export interface EgresoFiltros {
  filtro?: string;
  idCliente?: number | null;
  idArea?: number | null;
  tipoEgreso?: TipoEgreso | string | null;
  desde?: string;
  hasta?: string;
  fechaInicio?: string;
  fechaFin?: string;
  estado?: string;
  page?: number;
  size?: number;
  sort?: string;
}
