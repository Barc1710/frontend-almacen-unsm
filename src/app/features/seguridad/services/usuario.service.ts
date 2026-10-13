import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ApiResponse,
  PageResponse,
  getApiResponseData,
} from '../../../core/models';
import {
  Usuario,
  UsuarioCreateRequest,
  UsuarioFiltros,
  UsuarioResetClaveRequest,
  UsuarioUpdateRequest,
} from '../models';

@Service()
export class UsuarioService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /**
   * Obtiene la lista paginada y filtrada de usuarios.
   * Consume GET /usuarios
   */
  listar(filtros: UsuarioFiltros = {}): Observable<PageResponse<Usuario>> {
    let params = new HttpParams();

    if (filtros.filtro !== undefined && filtros.filtro !== null) {
      const text = filtros.filtro.trim();
      if (text) {
        params = params.set('filtro', text);
      }
    }

    if (filtros.idPerfil !== undefined && filtros.idPerfil !== null && filtros.idPerfil > 0) {
      params = params.set('idPerfil', filtros.idPerfil.toString());
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

    return this.http
      .get<ApiResponse<PageResponse<Usuario>>>(`${this.apiUrl}/usuarios`, { params })
      .pipe(
        map((response) => {
          const data = getApiResponseData(response);
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
   * Registra un nuevo usuario en el sistema.
   * Consume POST /usuarios
   */
  crear(request: UsuarioCreateRequest): Observable<ApiResponse<Usuario>> {
    return this.http.post<ApiResponse<Usuario>>(`${this.apiUrl}/usuarios`, request);
  }

  /**
   * Actualiza los datos de un usuario existente.
   * Consume PUT /usuarios/{id}
   */
  actualizar(id: number, request: UsuarioUpdateRequest): Observable<ApiResponse<Usuario>> {
    return this.http.put<ApiResponse<Usuario>>(`${this.apiUrl}/usuarios/${id}`, request);
  }

  /**
   * Desactiva lógicamente a un usuario (estado = '0').
   * Consume DELETE /usuarios/{id}
   */
  desactivar(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/usuarios/${id}`);
  }

  /**
   * Activa lógicamente a un usuario previamente desactivado (estado = '1').
   * Consume PATCH /usuarios/{id}/activar
   */
  activar(id: number): Observable<ApiResponse<void>> {
    return this.http.patch<ApiResponse<void>>(`${this.apiUrl}/usuarios/${id}/activar`, {});
  }

  /**
   * Restablece la contraseña de un usuario.
   * Consume PATCH /usuarios/{id}/reset-clave
   */
  resetearClave(id: number, request: UsuarioResetClaveRequest): Observable<ApiResponse<void>> {
    return this.http.patch<ApiResponse<void>>(`${this.apiUrl}/usuarios/${id}/reset-clave`, request);
  }
}
