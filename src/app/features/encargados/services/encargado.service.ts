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
import { Encargado, EncargadoFiltros, EncargadoRequest } from '../models';

@Service()
export class EncargadoService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /**
   * Consulta el listado paginado de encargados de áreas/jefaturas con filtro opcional por término.
   * Consume GET /encargados?filtro=&page=&size=&sort=
   */
  listar(filtros: EncargadoFiltros = {}): Observable<PageResponse<Encargado>> {
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

    return this.http.get<unknown>(`${this.apiUrl}/encargados`, { params }).pipe(
      map((response) => {
        if (isPageResponse<Encargado>(response)) {
          return response;
        }

        const data =
          typeof response === 'object' && response !== null
            ? getApiResponseData(response as ApiResponse<PageResponse<Encargado>>)
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
   * Lista todos los encargados activos (estado = '1').
   * Consume GET /encargados/activos
   */
  listarActivos(): Observable<Encargado[]> {
    return this.http.get<unknown>(`${this.apiUrl}/encargados/activos`).pipe(
      map((res) => {
        if (Array.isArray(res)) return res as Encargado[];
        if (typeof res === 'object' && res !== null) {
          const data = getApiResponseData(res as ApiResponse<Encargado[]>);
          if (Array.isArray(data)) return data;
        }
        return [];
      }),
    );
  }

  /**
   * Obtiene un encargado por su identificador.
   * Consume GET /encargados/{id}
   */
  obtenerPorId(id: number): Observable<Encargado> {
    return this.http.get<ApiResponse<Encargado>>(`${this.apiUrl}/encargados/${id}`).pipe(
      map((res) => {
        const data = getApiResponseData(res);
        if (!data) throw new Error('Encargado no encontrado');
        return data;
      }),
    );
  }

  /**
   * Registra un nuevo encargado.
   * Consume POST /encargados
   */
  crear(request: EncargadoRequest): Observable<ApiResponse<Encargado>> {
    return this.http.post<ApiResponse<Encargado>>(`${this.apiUrl}/encargados`, request);
  }

  /**
   * Actualiza los datos de un encargado.
   * Consume PUT /encargados/{id}
   */
  actualizar(id: number, request: EncargadoRequest): Observable<ApiResponse<Encargado>> {
    return this.http.put<ApiResponse<Encargado>>(`${this.apiUrl}/encargados/${id}`, request);
  }

  /**
   * Realiza la eliminación lógica del encargado (cambia estado a '0').
   * Consume DELETE /encargados/{id}
   */
  eliminar(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/encargados/${id}`);
  }
}
