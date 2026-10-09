import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ApiResponse,
  getApiResponseData,
  isPageResponse,
  PageResponse,
} from '../../../core/models';
import { MarcaFiltros, MarcaRequest, MarcaResponse } from '../models';

@Service()
export class MarcaService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /**
   * Consulta el listado paginado de marcas con filtro opcional por término.
   * Consume GET /api/v1/marcas?filtro=&page=&size=&sort=
   */
  listar(filtros: MarcaFiltros = {}): Observable<PageResponse<MarcaResponse>> {
    let params = new HttpParams();

    if (filtros.filtro !== undefined && filtros.filtro !== null) {
      const text = filtros.filtro.trim();
      if (text) {
        params = params.set('filtro', text);
      }
    }

    if (filtros.sort) {
      params = params.set('sort', filtros.sort);
    }

    const page = filtros.page ?? 0;
    const size = filtros.size ?? 10;
    params = params.set('page', page.toString()).set('size', size.toString());

    return this.http.get<unknown>(`${this.apiUrl}/marcas`, { params }).pipe(
      map((response) => {
        if (isPageResponse<MarcaResponse>(response)) {
          return response;
        }

        const data =
          typeof response === 'object' && response !== null
            ? getApiResponseData(response as ApiResponse<PageResponse<MarcaResponse>>)
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

  /**
   * Lista todas las marcas en estado activo (estado = '1').
   * Consume GET /api/v1/marcas/activos
   */
  listarActivos(): Observable<MarcaResponse[]> {
    return this.http.get<unknown>(`${this.apiUrl}/marcas/activos`).pipe(
      map((res) => {
        if (Array.isArray(res)) return res as MarcaResponse[];
        if (typeof res === 'object' && res !== null) {
          const data = getApiResponseData(res as ApiResponse<MarcaResponse[]>);
          if (Array.isArray(data)) return data;
        }
        return [];
      }),
    );
  }

  /**
   * Obtiene el detalle de una marca por su identificador.
   * Consume GET /api/v1/marcas/{id}
   */
  obtenerPorId(id: number): Observable<MarcaResponse> {
    return this.http.get<ApiResponse<MarcaResponse>>(`${this.apiUrl}/marcas/${id}`).pipe(
      map((res) => {
        const data = getApiResponseData(res);
        if (!data) throw new Error('Marca no encontrada');
        return data;
      }),
    );
  }

  /**
   * Registra una nueva marca o reactiva una existente.
   * Consume POST /api/v1/marcas
   */
  crear(request: MarcaRequest): Observable<ApiResponse<MarcaResponse>> {
    return this.http.post<ApiResponse<MarcaResponse>>(`${this.apiUrl}/marcas`, request);
  }

  /**
   * Actualiza el nombre de una marca existente.
   * Consume PUT /api/v1/marcas/{id}
   */
  actualizar(id: number, request: MarcaRequest): Observable<ApiResponse<MarcaResponse>> {
    return this.http.put<ApiResponse<MarcaResponse>>(`${this.apiUrl}/marcas/${id}`, request);
  }

  /**
   * Da de baja / desactiva lógicamente una marca (cambia estado a '0').
   * Consume DELETE /api/v1/marcas/{id}
   */
  eliminar(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.apiUrl}/marcas/${id}`)
      .pipe(map(() => void 0));
  }
}
