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
  CrearUsuarioEncargadoRequest,
  EncargadoAlmacen,
  EncargadoAlmacenFiltros,
  EncargadoAlmacenRequest,
} from '../models';

@Service()
export class EncargadoAlmacenService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /**
   * Consulta el listado paginado de personal de custodia de almacén.
   * Consume GET /encargados-almacen?filtro=&page=&size=&sort=
   */
  listar(filtros: EncargadoAlmacenFiltros = {}): Observable<PageResponse<EncargadoAlmacen>> {
    let params = new HttpParams();

    if (filtros.filtro !== undefined && filtros.filtro !== null) {
      const text = filtros.filtro.trim();
      if (text) {
        params = params.set('filtro', text);
      }
    }

    if (filtros.estado !== undefined && filtros.estado !== null && filtros.estado.trim() !== '') {
      params = params.set('estado', filtros.estado.trim());
    }

    if (filtros.sort) {
      params = params.set('sort', filtros.sort);
    }

    const page = filtros.page ?? 0;
    const size = filtros.size ?? 10;
    params = params.set('page', page.toString()).set('size', size.toString());

    return this.http.get<unknown>(`${this.apiUrl}/encargados-almacen`, { params }).pipe(
      map((response) => {
        if (isPageResponse<EncargadoAlmacen>(response)) {
          return response;
        }

        const data =
          typeof response === 'object' && response !== null
            ? getApiResponseData(response as ApiResponse<PageResponse<EncargadoAlmacen>>)
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
   * Lista el personal de custodia activo (estado = '1').
   * Consume GET /encargados-almacen/activos
   */
  listarActivos(): Observable<EncargadoAlmacen[]> {
    return this.http.get<unknown>(`${this.apiUrl}/encargados-almacen/activos`).pipe(
      map((res) => {
        if (Array.isArray(res)) return res as EncargadoAlmacen[];
        if (typeof res === 'object' && res !== null) {
          const data = getApiResponseData(res as ApiResponse<EncargadoAlmacen[]>);
          if (Array.isArray(data)) return data;
        }
        return [];
      }),
    );
  }

  /**
   * Obtiene los datos de un encargado de almacén por ID.
   * Consume GET /encargados-almacen/{id}
   */
  obtenerPorId(id: number): Observable<EncargadoAlmacen> {
    return this.http
      .get<ApiResponse<EncargadoAlmacen>>(`${this.apiUrl}/encargados-almacen/${id}`)
      .pipe(
        map((res) => {
          const data = getApiResponseData(res);
          if (!data) throw new Error('Personal de almacén no encontrado');
          return data;
        }),
      );
  }

  /**
   * Registra un nuevo personal de custodia de almacén.
   * Consume POST /encargados-almacen
   */
  crear(request: EncargadoAlmacenRequest): Observable<ApiResponse<EncargadoAlmacen>> {
    return this.http.post<ApiResponse<EncargadoAlmacen>>(
      `${this.apiUrl}/encargados-almacen`,
      request,
    );
  }

  /**
   * Actualiza el personal de almacén (nombre y/o titularidad).
   * Consume PUT /encargados-almacen/{id}
   */
  actualizar(
    id: number,
    request: EncargadoAlmacenRequest,
  ): Observable<ApiResponse<EncargadoAlmacen>> {
    return this.http.put<ApiResponse<EncargadoAlmacen>>(
      `${this.apiUrl}/encargados-almacen/${id}`,
      request,
    );
  }

  /**
   * Alterna la condición de titular de turno de forma atómica en el servidor.
   * Consume PATCH /encargados-almacen/{id}/titular
   */
  alternarTitular(id: number): Observable<ApiResponse<EncargadoAlmacen>> {
    return this.http.patch<ApiResponse<EncargadoAlmacen>>(
      `${this.apiUrl}/encargados-almacen/${id}/titular`,
      {},
    );
  }

  /**
   * Desactiva lógicamente al personal de custodia (cambia estado a '0').
   * Consume DELETE /encargados-almacen/{id}
   */
  desactivar(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/encargados-almacen/${id}`);
  }

  /**
   * Activa al personal de custodia (cambia estado a '1').
   * Consume PATCH /encargados-almacen/{id}/activar
   */
  activar(id: number): Observable<ApiResponse<void>> {
    return this.http.patch<ApiResponse<void>>(
      `${this.apiUrl}/encargados-almacen/${id}/activar`,
      {},
    );
  }

  /**
   * Crea y vincula una cuenta de usuario para el personal de custodia.
   * Consume POST /encargados-almacen/{id}/crear-usuario
   */
  crearUsuario(
    id: number,
    request: CrearUsuarioEncargadoRequest,
  ): Observable<ApiResponse<EncargadoAlmacen>> {
    return this.http.post<ApiResponse<EncargadoAlmacen>>(
      `${this.apiUrl}/encargados-almacen/${id}/crear-usuario`,
      request,
    );
  }
}
