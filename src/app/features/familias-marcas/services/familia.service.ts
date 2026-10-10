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
import { FamiliaFiltros, FamiliaRequest, FamiliaResponse } from '../models';

@Service()
export class FamiliaService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /**
   * Consulta el listado paginado de familias con filtro opcional por término.
   * Consume GET /api/v1/familias?filtro=&page=&size=&sort=
   */
  listar(filtros: FamiliaFiltros = {}): Observable<PageResponse<FamiliaResponse>> {
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

    return this.http.get<unknown>(`${this.apiUrl}/familias`, { params }).pipe(
      map((response) => {
        if (isPageResponse<FamiliaResponse>(response)) {
          return response;
        }

        const data =
          typeof response === 'object' && response !== null
            ? getApiResponseData(response as ApiResponse<PageResponse<FamiliaResponse>>)
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
   * Lista todas las familias en estado activo (estado = '1').
   * Consume GET /api/v1/familias/activos
   */
  listarActivos(): Observable<FamiliaResponse[]> {
    return this.http.get<unknown>(`${this.apiUrl}/familias/activos`).pipe(
      map((res) => {
        if (Array.isArray(res)) return res as FamiliaResponse[];
        if (typeof res === 'object' && res !== null) {
          const data = getApiResponseData(res as ApiResponse<FamiliaResponse[]>);
          if (Array.isArray(data)) return data;
        }
        return [];
      }),
    );
  }

  /**
   * Obtiene el detalle de una familia por su identificador.
   * Consume GET /api/v1/familias/{id}
   */
  obtenerPorId(id: number): Observable<FamiliaResponse> {
    return this.http.get<ApiResponse<FamiliaResponse>>(`${this.apiUrl}/familias/${id}`).pipe(
      map((res) => {
        const data = getApiResponseData(res);
        if (!data) throw new Error('Familia no encontrada');
        return data;
      }),
    );
  }

  /**
   * Registra una nueva familia o reactiva una existente.
   * Consume POST /api/v1/familias
   */
  crear(request: FamiliaRequest): Observable<ApiResponse<FamiliaResponse>> {
    return this.http.post<ApiResponse<FamiliaResponse>>(`${this.apiUrl}/familias`, request);
  }

  /**
   * Actualiza el nombre e inicial de una familia existente.
   * Consume PUT /api/v1/familias/{id}
   */
  actualizar(id: number, request: FamiliaRequest): Observable<ApiResponse<FamiliaResponse>> {
    return this.http.put<ApiResponse<FamiliaResponse>>(`${this.apiUrl}/familias/${id}`, request);
  }

  /**
   * Sugiere una inicial disponible para el nombre proporcionado.
   * Consume GET /api/v1/familias/sugerir-inicial?nombre=
   */
  sugerirInicial(nombre: string): Observable<string> {
    const params = new HttpParams().set('nombre', nombre);
    return this.http
      .get<ApiResponse<string>>(`${this.apiUrl}/familias/sugerir-inicial`, { params })
      .pipe(map((res) => getApiResponseData(res) ?? ''));
  }

  /**
   * Da de baja / desactiva lógicamente una familia (cambia estado a '0').
   * Consume DELETE /api/v1/familias/{id}
   */
  eliminar(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.apiUrl}/familias/${id}`)
      .pipe(map(() => void 0));
  }
}
