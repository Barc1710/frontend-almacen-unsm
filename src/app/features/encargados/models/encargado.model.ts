/**
 * Representación de un Encargado o Jefe de Área / Responsable firmante.
 * Refleja el contrato de EncargadoResponse del backend.
 */
export interface Encargado {
  readonly id: number;
  readonly siglaProfesion?: string | null;
  readonly nombres: string;
  readonly apellidos: string;
  readonly nombreCompleto?: string | null;
  readonly dni?: string | null;
  readonly cargo?: string | null;
  readonly estado?: string;
  readonly idUsuario?: number | null;
  readonly loginUsuario?: string | null;
  readonly tieneUsuario?: boolean;
}

/**
 * Payload para registro y actualización de Encargado.
 * Refleja el contrato de EncargadoRequest del backend.
 */
export interface EncargadoRequest {
  siglaProfesion?: string | null;
  nombres: string;
  apellidos: string;
  dni?: string | null;
  cargo?: string | null;
}

/**
 * Parámetros para consulta paginada y filtrado de encargados.
 */
export interface EncargadoFiltros {
  filtro?: string;
  estado?: string;
  page?: number;
  size?: number;
  sort?: string;
}

/**
 * Payload para creación y vinculación de usuario para un encargado.
 */
export interface CrearUsuarioEncargadoRequest {
  usuario: string;
  clave: string;
  correo?: string | null;
  telefono?: string | null;
  idPerfil: number;
}
