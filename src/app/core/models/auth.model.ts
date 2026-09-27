/**
 * Modelo para la solicitud de inicio de sesión (/auth/login).
 */
export interface LoginRequest {
  /** Nombre de usuario institucional */
  readonly usuario: string;
  /** Contraseña o clave de acceso */
  readonly clave: string;
}

/**
 * Respuesta emitida por el backend al autenticar credenciales satisfactoriamente.
 */
export interface JwtResponse {
  /** Token JWT (Bearer) emitido para las peticiones subsecuentes */
  readonly token: string;
  /** Identificador o login del usuario */
  readonly usuario: string;
  /** Nombre completo o de visualización del usuario */
  readonly nombre: string;
  /** Perfil o rol asignado (ej. 'ADMINISTRADOR', etc.) */
  readonly perfil: string;
  /** Bandera que indica si el usuario debe cambiar su clave obligatoriamente */
  readonly debeCambiarClave: boolean;
}

/**
 * Estructura de módulos autorizados devueltos por el endpoint /auth/mis-modulos.
 */
export interface ModuloResponse {
  /** Identificador numérico del módulo */
  readonly id: number;
  /** Código único e inmutable del módulo (ej. 'ARTICULOS', 'KARDEX') */
  readonly codigo: string;
  /** Nombre representativo del módulo para la interfaz */
  readonly nombre: string;
  /** Ruta o URL de navegación en el cliente frontend */
  readonly url: string;
  /** Nombre del ícono Lucide sugerido o null */
  readonly icono: string | null;
  /** Orden secuencial de visualización en el menú */
  readonly orden: number;
}

/**
 * Datos del usuario activo en la sesión del cliente.
 */
export interface AuthUser {
  readonly usuario: string;
  readonly nombre: string;
  readonly perfil: string;
  readonly debeCambiarClave: boolean;
}

/**
 * Type guard para verificar si un objeto cumple con la estructura LoginRequest.
 */
export function isLoginRequest(value: unknown): value is LoginRequest {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return typeof candidate['usuario'] === 'string' && typeof candidate['clave'] === 'string';
}

/**
 * Type guard para verificar si un objeto cumple con la estructura JwtResponse.
 */
export function isJwtResponse(value: unknown): value is JwtResponse {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate['token'] === 'string' &&
    typeof candidate['usuario'] === 'string' &&
    typeof candidate['nombre'] === 'string' &&
    typeof candidate['perfil'] === 'string' &&
    typeof candidate['debeCambiarClave'] === 'boolean'
  );
}

/**
 * Type guard para verificar si un objeto cumple con la estructura ModuloResponse.
 */
export function isModuloResponse(value: unknown): value is ModuloResponse {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate['id'] === 'number' &&
    typeof candidate['codigo'] === 'string' &&
    typeof candidate['nombre'] === 'string' &&
    typeof candidate['url'] === 'string' &&
    (candidate['icono'] === null || typeof candidate['icono'] === 'string') &&
    typeof candidate['orden'] === 'number'
  );
}

/**
 * Type guard para verificar si un objeto corresponde a un arreglo de ModuloResponse.
 */
export function isModuloResponseList(value: unknown): value is ModuloResponse[] {
  return Array.isArray(value) && value.every(isModuloResponse);
}
