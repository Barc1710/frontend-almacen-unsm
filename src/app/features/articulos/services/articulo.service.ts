import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { catchError, map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ApiResponse,
  getApiResponseData,
  isPageResponse,
  PageResponse,
} from '../../../core/models';
import {
  Articulo,
  ArticuloCreateRequest,
  ArticuloFiltros,
  ArticuloResumen,
  ArticuloUpdateRequest,
  Familia,
  Marca,
  Ubicacion,
  UnidadMedida,
} from '../models';

@Service()
export class ArticuloService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  listar(filtros: ArticuloFiltros = {}): Observable<PageResponse<Articulo>> {
    let params = new HttpParams();

    const append = (key: string, val: string | number | undefined | null) => {
      if (val !== undefined && val !== null) {
        const text = String(val).trim();
        if (text) params = params.set(key, text);
      }
    };

    append('filtro', filtros.filtro);
    append('codigo', filtros.codigo);
    append('descripcion', filtros.descripcion);
    append('idFamilia', filtros.idFamilia);
    if (filtros.activo !== undefined && filtros.activo !== null) {
      append('activo', String(filtros.activo));
    }
    append('estado', filtros.estado);
    if (filtros.soloConStock !== undefined) {
      append('soloConStock', String(filtros.soloConStock));
    }
    append('sort', filtros.sort);

    const page = filtros.page ?? 0;
    const size = filtros.size ?? 10;
    params = params.set('page', page.toString()).set('size', size.toString());

    return this.http.get<unknown>(`${this.apiUrl}/articulos`, { params }).pipe(
      map((response) => {
        if (isPageResponse<Articulo>(response)) return response;

        const data =
          typeof response === 'object' && response !== null
            ? getApiResponseData(response as ApiResponse<PageResponse<Articulo>>)
            : undefined;

        return (
          data ?? {
            content: [],
            page,
            number: page,
            size,
            totalElements: 0,
            totalPages: 0,
            first: true,
            last: true,
            empty: true,
          }
        );
      }),
    );
  }

  obtenerPorId(id: number): Observable<Articulo> {
    return this.http.get<ApiResponse<Articulo>>(`${this.apiUrl}/articulos/${id}`).pipe(
      map((res) => {
        const data = getApiResponseData(res);
        if (!data) throw new Error('Artículo no encontrado');
        return data;
      }),
    );
  }

  buscarPredictivo(termino?: string, soloConStock = true): Observable<ArticuloResumen[]> {
    let params = new HttpParams().set('soloConStock', String(soloConStock));
    if (termino && termino.trim()) {
      params = params.set('q', termino.trim());
    }
    return this.http.get<unknown>(`${this.apiUrl}/articulos/buscar`, { params }).pipe(
      map((res) => {
        if (!res) return [];
        if (Array.isArray(res)) return res as ArticuloResumen[];
        if (typeof res === 'object') {
          const data = getApiResponseData(res as ApiResponse<ArticuloResumen[]>);
          if (Array.isArray(data)) return data;
        }
        return [];
      }),
    );
  }

  obtenerSiguienteCodigo(idFamilia: number): Observable<string> {
    const params = new HttpParams().set('idFamilia', idFamilia.toString());
    return this.http.get<unknown>(`${this.apiUrl}/articulos/siguiente-codigo`, { params }).pipe(
      map((res) => {
        if (typeof res === 'string') return res;
        if (typeof res === 'object' && res !== null) {
          const data = getApiResponseData(res as ApiResponse<string>);
          if (typeof data === 'string') return data;

          const cand = res as Record<string, unknown>;
          if (typeof cand['codigo'] === 'string') return cand['codigo'];
          if (typeof cand['siguienteCodigo'] === 'string') return cand['siguienteCodigo'];
        }
        return '';
      }),
    );
  }

  crear(request: ArticuloCreateRequest): Observable<Articulo> {
    return this.http.post<ApiResponse<Articulo>>(`${this.apiUrl}/articulos`, request).pipe(
      map((res) => {
        const data = getApiResponseData(res);
        if (!data) throw new Error('Error al crear el artículo');
        return data;
      }),
    );
  }

  actualizar(id: number, request: ArticuloUpdateRequest): Observable<Articulo> {
    return this.http.put<ApiResponse<Articulo>>(`${this.apiUrl}/articulos/${id}`, request).pipe(
      map((res) => {
        const data = getApiResponseData(res);
        if (!data) throw new Error('Error al actualizar el artículo');
        return data;
      }),
    );
  }

  eliminar(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.apiUrl}/articulos/${id}`)
      .pipe(map(() => void 0));
  }

  toggleActivo(id: number): Observable<Articulo> {
    return this.http
      .patch<ApiResponse<Articulo>>(`${this.apiUrl}/articulos/${id}/toggle-activo`, {})
      .pipe(
        map((res) => {
          const data = getApiResponseData(res);
          if (!data) throw new Error('Error al cambiar operatividad del artículo');
          return data;
        }),
      );
  }

  listarUnidadesMedidaActivas(): Observable<UnidadMedida[]> {
    return this.fetchCatalog<UnidadMedida>('/unidades-medida/activas', '/unidades-medida?size=200');
  }

  listarFamiliasActivas(): Observable<Familia[]> {
    return this.fetchCatalog<Familia>('/familias/activos', '/familias?size=200');
  }

  listarMarcasActivas(): Observable<Marca[]> {
    return this.fetchCatalog<Marca>('/marcas/activos', '/marcas?size=200');
  }

  listarUbicacionesActivas(): Observable<Ubicacion[]> {
    return this.fetchCatalog<Ubicacion>('/ubicaciones/activos', '/ubicaciones?size=200');
  }

  private fetchCatalog<T>(activeUrl: string, fallbackUrl: string): Observable<T[]> {
    return this.http.get<unknown>(`${this.apiUrl}${activeUrl}`).pipe(
      map((res) => this.extractList<T>(res)),
      catchError(() =>
        this.http
          .get<unknown>(`${this.apiUrl}${fallbackUrl}`)
          .pipe(map((res) => this.extractList<T>(res))),
      ),
    );
  }

  private extractList<T>(res: unknown): T[] {
    if (!res) return [];
    if (Array.isArray(res)) return res as T[];
    if (isPageResponse<T>(res)) return res.content;
    if (typeof res === 'object') {
      const data = getApiResponseData(res as ApiResponse<T[] | PageResponse<T>>);
      if (!data) return [];
      if (Array.isArray(data)) return data;
      if (isPageResponse<T>(data)) return data.content;
    }
    return [];
  }
}
