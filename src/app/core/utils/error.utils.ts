/**
 * Extrae el mensaje de error de una respuesta HTTP o excepción de forma segura y tipada.
 *
 * @param err Objeto de error capturado en el bloque error del Observable.
 * @param fallback Mensaje por defecto si no se encuentra un mensaje específico.
 * @returns El mensaje descriptivo del error.
 */
export function extraerMensajeError(
  err: unknown,
  fallback = 'Ha ocurrido un error inesperado al procesar la solicitud.',
): string {
  if (err && typeof err === 'object') {
    const e = err as {
      error?: { message?: string; mensaje?: string } | string;
      message?: string;
    };

    if (typeof e.error === 'string' && e.error.trim().length > 0) {
      return e.error;
    }

    if (e.error && typeof e.error === 'object') {
      if (typeof e.error.message === 'string' && e.error.message.trim().length > 0) {
        return e.error.message;
      }
      if (typeof e.error.mensaje === 'string' && e.error.mensaje.trim().length > 0) {
        return e.error.mensaje;
      }
    }

    if (typeof e.message === 'string' && e.message.trim().length > 0) {
      return e.message;
    }
  }

  return fallback;
}
