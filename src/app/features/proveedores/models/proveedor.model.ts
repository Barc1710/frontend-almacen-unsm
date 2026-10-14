export interface Proveedor {
  readonly id: number;
  readonly ruc: string | null;
  readonly razonSocial: string;
  readonly telefono: string | null;
  readonly correo: string | null;
  readonly direccion: string | null;
  readonly contacto: string | null;
  readonly banco: string | null;
  readonly cuentaCorriente: string | null;
  readonly estado: string; // '1' = Activo, '0' = Inactivo
}

export interface ProveedorRequest {
  readonly ruc?: string | null;
  readonly razonSocial: string;
  readonly telefono?: string | null;
  readonly correo?: string | null;
  readonly direccion?: string | null;
  readonly contacto?: string | null;
  readonly banco?: string | null;
  readonly cuentaCorriente?: string | null;
}

export interface ProveedorFiltros {
  readonly filtro?: string;
  readonly page?: number;
  readonly size?: number;
  readonly sort?: string;
}
