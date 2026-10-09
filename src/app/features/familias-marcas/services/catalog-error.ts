export function catalogErrorMessage(error: unknown, fallback: string): string {
  const body =
    typeof error === 'object' && error !== null && 'error' in error ? error.error : error;
  if (typeof body === 'string' && body.trim()) return body;
  if (typeof body === 'object' && body !== null) {
    for (const key of ['mensaje', 'message'] as const) {
      if (key in body) {
        const message = (body as Record<string, unknown>)[key];
        if (typeof message === 'string' && message.trim()) return message;
      }
    }
  }
  return fallback;
}
