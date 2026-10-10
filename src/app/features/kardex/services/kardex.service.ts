import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ApiResponse,
  getApiResponseData,
  isPageResponse,
  PageResponse,
} from '../../../core/models';
import { Articulo, ArticuloResumen } from '../../articulos/models';
import { KardexFiltros, KardexMovimiento } from '../models';

@Injectable({
  providedIn: 'root',
})
export class KardexService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /**
   * Consulta los movimientos generales de Kardex para auditoría global (orden DESC).
   * Consume GET /api/v1/kardex/general
   */
  listarGeneral(
    filtros: KardexFiltros = {},
    page = 0,
    size = 10,
  ): Observable<PageResponse<KardexMovimiento>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (filtros.desde?.trim()) {
      params = params.set('desde', filtros.desde.trim());
    }
    if (filtros.hasta?.trim()) {
      params = params.set('hasta', filtros.hasta.trim());
    }
    if (filtros.tipoMovimiento?.trim()) {
      params = params.set('tipoMovimiento', filtros.tipoMovimiento.trim());
    }

    return this.http
      .get<ApiResponse<PageResponse<KardexMovimiento>>>(`${this.apiUrl}/kardex/general`, {
        params,
      })
      .pipe(
        map((response) => {
          if (isPageResponse<KardexMovimiento>(response)) {
            return response;
          }
          const data = getApiResponseData(response);
          if (data && isPageResponse<KardexMovimiento>(data)) {
            return data;
          }
          return {
            content: [],
            totalElements: 0,
            totalPages: 0,
            size,
            number: page,
            page,
          };
        }),
      );
  }

  /**
   * Consulta el Kardex contable por artículo (orden ASC cronológico).
   * Consume GET /api/v1/kardex/articulo/{idArticulo}
   */
  listarPorArticulo(
    idArticulo: number,
    filtros: KardexFiltros = {},
    page = 0,
    size = 10,
  ): Observable<PageResponse<KardexMovimiento>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', 'fechaHora,desc');

    if (filtros.desde?.trim()) {
      params = params.set('desde', filtros.desde.trim());
    }
    if (filtros.hasta?.trim()) {
      params = params.set('hasta', filtros.hasta.trim());
    }
    if (filtros.tipoMovimiento?.trim()) {
      params = params.set('tipoMovimiento', filtros.tipoMovimiento.trim());
    }

    return this.http
      .get<ApiResponse<PageResponse<KardexMovimiento>>>(
        `${this.apiUrl}/kardex/articulo/${idArticulo}`,
        { params },
      )
      .pipe(
        map((response) => {
          if (isPageResponse<KardexMovimiento>(response)) {
            return response;
          }
          const data = getApiResponseData(response);
          if (data && isPageResponse<KardexMovimiento>(data)) {
            return data;
          }
          return {
            content: [],
            totalElements: 0,
            totalPages: 0,
            size,
            number: page,
            page,
          };
        }),
      );
  }

  /**
   * Búsqueda predictiva de artículos por término (código o descripción).
   * Consume GET /api/v1/articulos/buscar?q={termino}
   */
  buscarArticulos(termino: string): Observable<ArticuloResumen[]> {
    const query = termino.trim();
    const params = new HttpParams().set('q', query);

    return this.http
      .get<ApiResponse<ArticuloResumen[]>>(`${this.apiUrl}/articulos/buscar`, {
        params,
      })
      .pipe(
        map((response) => {
          const data = getApiResponseData(response);
          if (Array.isArray(data)) {
            return data;
          }
          if (Array.isArray(response)) {
            return response as unknown as ArticuloResumen[];
          }
          return [];
        }),
      );
  }

  /**
   * Obtiene la información detallada de un artículo por su ID.
   * Consume GET /api/v1/articulos/{id}
   */
  obtenerArticuloPorId(idArticulo: number): Observable<Articulo | null> {
    return this.http
      .get<ApiResponse<Articulo>>(`${this.apiUrl}/articulos/${idArticulo}`)
      .pipe(
        map((response) => {
          const data = getApiResponseData(response);
          return data ?? (response as unknown as Articulo) ?? null;
        }),
      );
  }
}
