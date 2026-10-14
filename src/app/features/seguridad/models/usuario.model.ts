export interface Usuario {
  readonly id: number;
  readonly usuario: string;
  readonly nombre: string;
  readonly apellido: string;
  readonly nombreCompleto: string;
  readonly dni: string | null;
  readonly correo: string | null;
  readonly telefono: string | null;
  readonly idPerfil: number;
  readonly nombrePerfil: string;
  readonly estado: string; // '1' = Activo, '0' = Inactivo
  readonly debeCambiarClave?: boolean;
}

export interface UsuarioCreateRequest {
  readonly usuario: string;
  readonly clave: string;
  readonly nombre: string;
  readonly apellido: string;
  readonly dni?: string | null;
  readonly telefono?: string | null;
  readonly correo?: string | null;
  readonly idPerfil: number;
}

export interface UsuarioUpdateRequest {
  readonly nombre: string;
  readonly apellido: string;
  readonly dni?: string | null;
  readonly telefono?: string | null;
  readonly correo?: string | null;
  readonly idPerfil: number;
  readonly estado: string; // '1' = Activo, '0' = Inactivo
}

export interface UsuarioResetClaveRequest {
  readonly nuevaClave: string;
}

export interface UsuarioFiltros {
  readonly filtro?: string;
  readonly idPerfil?: number;
  readonly estado?: string;
  readonly page?: number;
  readonly size?: number;
  readonly sort?: string;
}
