/** Resuelve URLs como el navegador, nunca contra el origen de la API por suposición. */
export function getApiPath(
  requestUrl: string,
  apiUrl: string,
  documentBase: string,
): string | null {
  if (/^[\/\\]{2}/.test(requestUrl) || /[\\\s\u0000-\u001f]/.test(requestUrl)) {
    return null;
  }

  try {
    const api = new URL(apiUrl, documentBase);
    const request = new URL(requestUrl, documentBase);
    if (
      !['http:', 'https:'].includes(api.protocol) ||
      request.origin !== api.origin ||
      request.username ||
      request.password ||
      /%(?:2f|5c|25)/i.test(request.pathname)
    ) {
      return null;
    }
    const basePath = api.pathname.replace(/\/+$/, '');
    if (request.pathname !== basePath && !request.pathname.startsWith(`${basePath}/`)) {
      return null;
    }
    return request.pathname.slice(basePath.length).replace(/\/+$/, '') || '/';
  } catch {
    return null;
  }
}
