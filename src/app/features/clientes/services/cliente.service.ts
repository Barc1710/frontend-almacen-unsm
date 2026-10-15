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
import { Cliente, ClienteFiltros, ClienteRequest } from '../models';

@Service()
export class ClienteService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /**
   * Consulta el listado paginado de clientes activos con filtro opcional.
   * Consume GET /clientes?filtro=&page=&size=&sort=
   */
  listar(filtros: ClienteFiltros = {}): Observable<PageResponse<Cliente>> {
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

    return this.http.get<unknown>(`${this.apiUrl}/clientes`, { params }).pipe(
      map((response) => {
        if (isPageResponse<Cliente>(response)) {
          return response;
        }

        const data =
          typeof response === 'object' && response !== null
            ? getApiResponseData(response as ApiResponse<PageResponse<Cliente>>)
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
   * Obtiene la lista completa de clientes activos.
   * Consume GET /clientes/activos
   */
  listarActivos(): Observable<Cliente[]> {
    return this.http
      .get<ApiResponse<Cliente[]>>(`${this.apiUrl}/clientes/activos`)
      .pipe(map((res) => getApiResponseData(res) ?? []));
  }

  /**
   * Obtiene un cliente por su identificador.
   * Consume GET /clientes/{id}
   */
  obtenerPorId(id: number): Observable<Cliente> {
    return this.http.get<ApiResponse<Cliente>>(`${this.apiUrl}/clientes/${id}`).pipe(
      map((res) => {
        const data = getApiResponseData(res);
        if (!data) throw new Error('Cliente no encontrado');
        return data;
      }),
    );
  }

  /**
   * Registra un nuevo cliente.
   * Consume POST /clientes
   */
  crear(request: ClienteRequest): Observable<ApiResponse<Cliente>> {
    return this.http.post<ApiResponse<Cliente>>(`${this.apiUrl}/clientes`, request);
  }

  /**
   * Actualiza los datos de un cliente existente.
   * Consume PUT /clientes/{id}
   */
  actualizar(id: number, request: ClienteRequest): Observable<ApiResponse<Cliente>> {
    return this.http.put<ApiResponse<Cliente>>(`${this.apiUrl}/clientes/${id}`, request);
  }

  /**
   * Elimina lógicamente un cliente.
   * Consume DELETE /clientes/{id}
   */
  eliminar(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/clientes/${id}`);
  }
}
