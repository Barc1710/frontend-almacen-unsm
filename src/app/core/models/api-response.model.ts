/**
 * Contratos de respuesta estandarizados del backend (Spring Boot).
 * Soporta las claves estándar ('success', 'message', 'data') así como
 * los alias en español ('exito', 'mensaje', 'datos') para máxima interoperabilidad.
 */
export interface ApiResponse<T = unknown> {
  /** Indica si la operación culminó exitosamente */
  readonly success?: boolean;
  /** Alias en español para el indicador de éxito */
  readonly exito?: boolean;

  /** Mensaje descriptivo proporcionado por el backend */
  readonly message?: string;
  /** Alias en español para el mensaje */
  readonly mensaje?: string;

  /** Carga de datos de la respuesta (null en errores o peticiones sin cuerpo) */
  readonly data?: T;
  /** Alias en español para la carga de datos */
  readonly datos?: T;
}

/**
 * Contrato de paginación para respuestas estructuradas de Spring Data.
 */
export interface PageResponse<T> {
  /** Lista de elementos de la página actual */
  readonly content: T[];
  /** Número de página actual (índice base 0, Spring Data usa 'number' o alias 'page') */
  readonly page?: number;
  readonly number?: number;
  /** Cantidad de elementos solicitados por página */
  readonly size: number;
  /** Total general de elementos existentes en la base de datos */
  readonly totalElements: number;
  /** Total general de páginas disponibles */
  readonly totalPages: number;
  /** Cantidad de elementos en la página actual */
  readonly numberOfElements?: number;
  /** Bandera que indica si es la primera página */
  readonly first?: boolean;
  /** Bandera que indica si es la última página */
  readonly last?: boolean;
  /** Bandera que indica si el contenido de la página está vacío */
  readonly empty?: boolean;
}

/**
 * Representación de error emitida por la API o capturada por el cliente.
 */
export interface ApiError {
  readonly status: number;
  readonly message: string;
  readonly error?: string;
}

/**
 * Type guard para validar si un valor desconocido corresponde a una ApiResponse.
 */
export function isApiResponse<T = unknown>(value: unknown): value is ApiResponse<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    ('exito' in value ||
      'success' in value ||
      'mensaje' in value ||
      'message' in value ||
      'datos' in value ||
      'data' in value)
  );
}

/**
 * Type guard para validar si un valor desconocido corresponde a una PageResponse de Spring.
 */
export function isPageResponse<T>(value: unknown): value is PageResponse<T> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    Array.isArray(candidate['content']) &&
    (typeof candidate['page'] === 'number' || typeof candidate['number'] === 'number') &&
    typeof candidate['size'] === 'number' &&
    typeof candidate['totalElements'] === 'number' &&
    typeof candidate['totalPages'] === 'number'
  );
}

/**
 * Obtiene el índice de la página actual de forma unificada (base 0).
 */
export function getPageNumber<T>(pageResponse: PageResponse<T>): number {
  return pageResponse.page ?? pageResponse.number ?? 0;
}

/**
 * Extrae de forma segura los datos de una respuesta ApiResponse,
 * priorizando la clave del backend ('datos') sobre el alias de compatibilidad ('data').
 */
export function getApiResponseData<T>(response: ApiResponse<T>): T | undefined {
  return response.datos !== undefined ? response.datos : response.data;
}

/**
 * Extrae de forma segura el mensaje de una respuesta ApiResponse,
 * priorizando la clave del backend ('mensaje') sobre el alias de compatibilidad ('message').
 */
export function getApiResponseMessage(response: ApiResponse<unknown>): string {
  return response.mensaje ?? response.message ?? '';
}

/**
 * Determina si la respuesta representa una operación exitosa,
 * priorizando la clave del backend ('exito') sobre el alias ('success').
 */
export function isApiResponseSuccess(response: ApiResponse<unknown>): boolean {
  if (response.exito !== undefined) {
    return response.exito;
  }
  if (response.success !== undefined) {
    return response.success;
  }
  return false;
}

