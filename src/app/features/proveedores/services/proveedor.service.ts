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
import {
  Proveedor,
  ProveedorFiltros,
  ProveedorRequest,
} from '../models';

@Service()
export class ProveedorService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /**
   * Consulta el listado paginado de proveedores activos con filtro de texto opcional.
   * Consume GET /proveedores?filtro=&page=&size=&sort=
   */
  listar(filtros: ProveedorFiltros = {}): Observable<PageResponse<Proveedor>> {
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

    return this.http.get<unknown>(`${this.apiUrl}/proveedores`, { params }).pipe(
      map((response) => {
        if (isPageResponse<Proveedor>(response)) {
          return response;
        }

        const data =
          typeof response === 'object' && response !== null
            ? getApiResponseData(response as ApiResponse<PageResponse<Proveedor>>)
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
   * Obtiene la lista completa de proveedores activos.
   * Consume GET /proveedores/activos
   */
  listarActivos(): Observable<Proveedor[]> {
    return this.http.get<ApiResponse<Proveedor[]>>(`${this.apiUrl}/proveedores/activos`).pipe(
      map((res) => getApiResponseData(res) ?? []),
    );
  }

  /**
   * Obtiene un proveedor por su ID.
   * Consume GET /proveedores/{id}
   */
  obtenerPorId(id: number): Observable<Proveedor> {
    return this.http.get<ApiResponse<Proveedor>>(`${this.apiUrl}/proveedores/${id}`).pipe(
      map((res) => {
        const data = getApiResponseData(res);
        if (!data) throw new Error('Proveedor no encontrado');
        return data;
      }),
    );
  }

  /**
   * Registra un nuevo proveedor.
   * Consume POST /proveedores
   */
  crear(request: ProveedorRequest): Observable<ApiResponse<Proveedor>> {
    return this.http.post<ApiResponse<Proveedor>>(`${this.apiUrl}/proveedores`, request);
  }

  /**
   * Actualiza los datos de un proveedor.
   * Consume PUT /proveedores/{id}
   */
  actualizar(id: number, request: ProveedorRequest): Observable<ApiResponse<Proveedor>> {
    return this.http.put<ApiResponse<Proveedor>>(`${this.apiUrl}/proveedores/${id}`, request);
  }

  /**
   * Elimina lógicamente un proveedor.
   * Consume DELETE /proveedores/{id}
   */
  eliminar(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/proveedores/${id}`);
  }
}
