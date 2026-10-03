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
  /** Bandera opcional que indica si el usuario debe cambiar su clave obligatoriamente */
  readonly debeCambiarClave?: boolean;
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
 * Normaliza de forma segura un objeto proveniente del backend a la interfaz ModuloResponse.
 * Tolera ids numéricos o string, campos opcionales de icono/orden y prefijos de ruta.
 */
export function normalizeModulo(value: unknown): ModuloResponse | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const raw = value as Record<string, unknown>;

  const id = typeof raw['id'] === 'number' ? raw['id'] : Number(raw['id']) || 0;
  const codigo = String(raw['codigo'] ?? raw['code'] ?? '').trim().toUpperCase();
  const nombre = String(raw['nombre'] ?? raw['name'] ?? codigo).trim();
  const rawUrl = String(raw['url'] ?? raw['ruta'] ?? raw['path'] ?? '').trim();
  const url = rawUrl ? (rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`) : '';
  const icono =
    typeof raw['icono'] === 'string'
      ? raw['icono'].trim()
      : typeof raw['icon'] === 'string'
        ? raw['icon'].trim()
        : null;
  const orden =
    typeof raw['orden'] === 'number'
      ? raw['orden']
      : Number(raw['orden']) || 0;

  if (!codigo && !url && !nombre) {
    return null;
  }

  const finalCodigo = codigo || (url ? url.replace(/^\//, '').replace(/\//g, '_').toUpperCase() : 'MODULO');
  const resolvedUrl = url || (finalCodigo ? `/${finalCodigo.toLowerCase()}` : '/dashboard');

  return {
    id,
    codigo: finalCodigo,
    nombre: nombre || finalCodigo || url,
    url: resolvedUrl,
    icono,
    orden,
  };
}

/**
 * Normaliza una colección de módulos provenientes del backend.
 */
export function normalizeModuloList(value: unknown): ModuloResponse[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map(normalizeModulo).filter((m): m is ModuloResponse => m !== null);
}
