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
 * Type guard para validar si un valor desconocido corresponde a una ApiResponse.
 */
export function isApiResponse<T = unknown>(value: unknown): value is ApiResponse<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    ('success' in value ||
      'exito' in value ||
      'message' in value ||
      'mensaje' in value ||
      'data' in value ||
      'datos' in value)
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
 * Extrae de forma segura los datos de una respuesta ApiResponse,
 * priorizando la clave del backend ('datos') sobre el alias de compatibilidad ('data').
 */
export function getApiResponseData<T>(response: ApiResponse<T>): T | undefined {
  return response.datos !== undefined ? response.datos : response.data;
}

