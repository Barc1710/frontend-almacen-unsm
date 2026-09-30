import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { catchError, map, Observable, of, shareReplay, throwError } from 'rxjs';
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

  private familiasCache$?: Observable<Familia[]>;
  private marcasCache$?: Observable<Marca[]>;
  private ubicacionesCache$?: Observable<Ubicacion[]>;
  private unidadesMedidaCache$?: Observable<UnidadMedida[]>;

  listar(filtros: ArticuloFiltros = {}): Observable<PageResponse<Articulo>> {
    let params = new HttpParams();

    if (filtros.filtro && filtros.filtro.trim().length > 0) {
      params = params.set('filtro', filtros.filtro.trim());
    }
    if (filtros.codigo && filtros.codigo.trim().length > 0) {
      params = params.set('codigo', filtros.codigo.trim());
    }
    if (filtros.descripcion && filtros.descripcion.trim().length > 0) {
      params = params.set('descripcion', filtros.descripcion.trim());
    }
    if (filtros.idFamilia !== undefined && filtros.idFamilia !== null) {
      params = params.set('idFamilia', filtros.idFamilia.toString());
    }
    if (filtros.estado && filtros.estado.trim().length > 0) {
      params = params.set('estado', filtros.estado.trim());
    }

    const page = filtros.page ?? 0;
    const size = filtros.size ?? 10;
    params = params.set('page', page.toString());
    params = params.set('size', size.toString());

    if (filtros.sort) {
      params = params.set('sort', filtros.sort);
    }

    return this.http.get<unknown>(`${this.apiUrl}/articulos`, { params }).pipe(
      map((response) => {
        if (isPageResponse<Articulo>(response)) {
          return response;
        }
        const data =
          typeof response === 'object' && response !== null
            ? getApiResponseData(response as ApiResponse<PageResponse<Articulo>>)
            : undefined;

        if (!data) {
          return {
            content: [],
            page,
            number: page,
            size,
            totalElements: 0,
            totalPages: 0,
            first: true,
            last: true,
            empty: true,
          };
        }
        return data;
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
    if (!this.unidadesMedidaCache$) {
      this.unidadesMedidaCache$ = this.http
        .get<unknown>(`${this.apiUrl}/unidades-medida/activas`)
        .pipe(
          map((res) => this.extractList<UnidadMedida>(res)),
          catchError(() =>
            this.http
              .get<unknown>(`${this.apiUrl}/unidades-medida?size=200`)
              .pipe(map((res) => this.extractList<UnidadMedida>(res))),
          ),
          catchError((err) => {
            this.unidadesMedidaCache$ = undefined;
            return throwError(() => err);
          }),
          shareReplay({ bufferSize: 1, refCount: false }),
        );
    }
    return this.unidadesMedidaCache$;
  }

  listarFamiliasActivas(): Observable<Familia[]> {
    if (!this.familiasCache$) {
      this.familiasCache$ = this.http.get<unknown>(`${this.apiUrl}/familias/activos`).pipe(
        map((res) => this.extractList<Familia>(res)),
        catchError(() =>
          this.http
            .get<unknown>(`${this.apiUrl}/familias?size=200`)
            .pipe(map((res) => this.extractList<Familia>(res))),
        ),
        catchError((err) => {
          this.familiasCache$ = undefined;
          return throwError(() => err);
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    }
    return this.familiasCache$;
  }

  listarMarcasActivas(): Observable<Marca[]> {
    if (!this.marcasCache$) {
      this.marcasCache$ = this.http.get<unknown>(`${this.apiUrl}/marcas/activos`).pipe(
        map((res) => this.extractList<Marca>(res)),
        catchError(() =>
          this.http
            .get<unknown>(`${this.apiUrl}/marcas?size=200`)
            .pipe(map((res) => this.extractList<Marca>(res))),
        ),
        catchError((err) => {
          this.marcasCache$ = undefined;
          return throwError(() => err);
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    }
    return this.marcasCache$;
  }

  listarUbicacionesActivas(): Observable<Ubicacion[]> {
    if (!this.ubicacionesCache$) {
      this.ubicacionesCache$ = this.http.get<unknown>(`${this.apiUrl}/ubicaciones/activos`).pipe(
        map((res) => this.extractList<Ubicacion>(res)),
        catchError(() =>
          this.http
            .get<unknown>(`${this.apiUrl}/ubicaciones?size=200`)
            .pipe(map((res) => this.extractList<Ubicacion>(res))),
        ),
        catchError((err) => {
          this.ubicacionesCache$ = undefined;
          return throwError(() => err);
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    }
    return this.ubicacionesCache$;
  }

  private extractList<T>(res: unknown): T[] {
    if (!res) return [];
    if (Array.isArray(res)) return res as T[];
    if (isPageResponse<T>(res)) return res.content;
    if (typeof res === 'object' && res !== null) {
      const data = getApiResponseData(res as ApiResponse<T[] | PageResponse<T>>);
      if (!data) return [];
      if (Array.isArray(data)) return data;
      if (isPageResponse<T>(data)) return data.content;
    }
    return [];
  }
}
