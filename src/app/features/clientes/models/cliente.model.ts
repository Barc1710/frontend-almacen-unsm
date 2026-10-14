export interface Cliente {
  readonly id: number;
  readonly nombre: string;
  readonly dni: string | null;
  readonly telefono: string | null;
  readonly correo: string | null;
  readonly direccion: string | null;
  readonly estado: string; // '1' = Activo, '0' = Inactivo
}

export interface ClienteRequest {
  readonly nombre: string;
  readonly dni?: string | null;
  readonly telefono?: string | null;
  readonly correo?: string | null;
  readonly direccion?: string | null;
}

export interface ClienteFiltros {
  readonly filtro?: string;
  readonly page?: number;
  readonly size?: number;
  readonly sort?: string;
}
