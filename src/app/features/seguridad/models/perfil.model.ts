import { ModuloResponse } from '../../../core/models';

export interface Perfil {
  readonly id: number;
  readonly nombre: string;
  readonly estado: number; // 1 = Activo, 0 = Inactivo
  readonly cantidadModulos?: number;
}

export interface PerfilRequest {
  readonly nombre: string;
}

export interface PerfilPermisosResponse {
  readonly idPerfil: number;
  readonly nombrePerfil: string;
  readonly modulosAutorizados: ModuloResponse[];
}

export interface AsignarPermisosRequest {
  readonly idsModulos: number[];
}
