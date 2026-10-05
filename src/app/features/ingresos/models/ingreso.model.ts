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

export interface EncargadoAlmacen {
  readonly id: number;
  readonly nombre: string;
  readonly estado: string;
  readonly esTitular: boolean;
  readonly cargo?: string | null;
}

export interface Encargado {
  readonly id: number;
  readonly siglaProfesion?: string | null;
  readonly nombres: string;
  readonly apellidos: string;
  readonly nombreCompleto?: string | null;
  readonly dni?: string | null;
  readonly cargo?: string | null;
  readonly ambiente?: string | null;
  readonly estado: string;
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
  readonly idEncargadoAlmacen?: number | null;
  readonly nombreEncargadoAlmacen?: string | null;
  readonly idJefe?: number | null;
  readonly nombreJefe?: string | null;
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
  readonly numeroOrden?: string;
  readonly numeroOrdenCompra?: string | null;
  readonly fecha: string;
  readonly observacion?: string | null;
  readonly idEncargadoAlmacen?: number | null;
  readonly idJefe?: number | null;
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
