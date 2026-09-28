import { getApiPath } from './api-url';

describe('getApiPath', () => {
  const api = 'https://almacen.example/api/v1';
  it('acepta una URL relativa solo si el navegador la resuelve en el origen de la API', () => {
    expect(getApiPath('/api/v1/articulos', api, 'https://almacen.example/')).toBe('/articulos');
    expect(getApiPath('/api/v1/articulos', api, 'https://frontend.example/')).toBeNull();
  });
  it('resuelve una API configurada con ruta relativa', () => {
    expect(getApiPath('/api/v1/articulos', '/api/v1', 'https://almacen.example/')).toBe(
      '/articulos',
    );
  });
  it.each([
    '//almacen.example/api/v1/articulos',
    ' https://almacen.example/api/v1/articulos',
    'https://user@almacen.example/api/v1/articulos',
    'https://almacen.example/api/v10/articulos',
    'https://almacen.example/api/v1/%252e%252e/privado',
    'https://almacen.example\\@external.example/api/v1',
  ])('rechaza destinos ambiguos: %s', (url) => {
    expect(getApiPath(url, api, 'https://almacen.example/')).toBeNull();
  });
});
