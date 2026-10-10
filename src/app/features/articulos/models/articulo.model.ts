export interface Articulo {
  readonly id: number;
  readonly codigo: string;
  readonly descripcion: string;
  readonly idUnidadMedida: number | null;
  readonly nombreUnidadMedida: string | null;
  readonly simboloUnidadMedida: string | null;
  readonly permiteDecimales: boolean | null;
  readonly idFamilia: number;
  readonly nombreFamilia: string;
  readonly idMarca: number | null;
  readonly nombreMarca: string | null;
  readonly idUbicacion: number | null;
  readonly nombreUbicacion: string | null;
  readonly saldo: number;
  readonly cantidadMinima: number;
  readonly precio: number;
  readonly activo: boolean;
  readonly estado: string;
  readonly detalle: string | null;
  readonly fecha: string;
}

export interface ArticuloResumen {
  readonly id: number;
  readonly codigo: string;
  readonly descripcion: string;
  readonly simboloUnidadMedida: string;
  readonly permiteDecimales: boolean;
  readonly saldo: number;
  readonly precio: number;
  readonly nombreFamilia?: string;
  readonly nombreMarca?: string;
  readonly nombreUbicacion?: string;
  readonly activo: boolean;
}

export interface ArticuloCreateRequest {
  readonly codigo: string;
  readonly descripcion: string;
  readonly idUnidadMedida?: number | null;
  readonly idFamilia: number;
  readonly idMarca: number;
  readonly idUbicacion: number;
  readonly cantidadMinima: number;
  readonly precio: number;
  readonly detalle?: string | null;
}

export interface ArticuloUpdateRequest {
  readonly descripcion: string;
  readonly idUnidadMedida?: number | null;
  readonly idFamilia: number;
  readonly idMarca: number;
  readonly idUbicacion: number;
  readonly cantidadMinima: number;
  readonly precio: number;
  readonly detalle?: string | null;
}

export interface ArticuloFiltros {
  filtro?: string;
  codigo?: string;
  descripcion?: string;
  idFamilia?: number | null;
  activo?: boolean | null;
  estado?: string;
  soloConStock?: boolean;
  page?: number;
  size?: number;
  sort?: string;
}

export interface Familia {
  readonly id: number;
  readonly nombre: string;
  readonly inicial: string;
  readonly correlativo: number;
  readonly estado: string;
}

export interface Marca {
  readonly id: number;
  readonly nombre: string;
  readonly estado: string;
}

export interface Ubicacion {
  readonly id: number;
  readonly nombre: string;
  readonly descripcion: string;
  readonly estado: string;
}

export interface UnidadMedida {
  readonly id: number;
  readonly codigoSunat: string;
  readonly nombre: string;
  readonly simbolo: string;
  readonly permiteDecimales: boolean;
  readonly estado: string;
}
