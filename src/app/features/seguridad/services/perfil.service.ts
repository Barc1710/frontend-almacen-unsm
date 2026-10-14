import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse, getApiResponseData } from '../../../core/models';
import {
  AsignarPermisosRequest,
  Perfil,
  PerfilPermisosResponse,
  PerfilRequest,
} from '../models';

@Service()
export class PerfilService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /**
   * Lista perfiles del sistema (activos, inactivos o todos si no se pasa estado).
   * Consume GET /perfiles
   */
  listar(estado?: number): Observable<Perfil[]> {
    const params: Record<string, string> = {};
    if (estado !== undefined && estado !== null) {
      params['estado'] = estado.toString();
    }
    return this.http
      .get<ApiResponse<Perfil[]>>(`${this.apiUrl}/perfiles`, { params })
      .pipe(map((res) => getApiResponseData(res) ?? []));
  }

  /**
   * Lista únicamente los perfiles activos del sistema.
   * Consume GET /perfiles/activos
   */
  listarActivos(): Observable<Perfil[]> {
    return this.http
      .get<ApiResponse<Perfil[]>>(`${this.apiUrl}/perfiles/activos`)
      .pipe(map((res) => getApiResponseData(res) ?? []));
  }

  /**
   * Crea un nuevo perfil en el sistema.
   * Consume POST /perfiles
   */
  crear(request: PerfilRequest): Observable<ApiResponse<Perfil>> {
    return this.http.post<ApiResponse<Perfil>>(`${this.apiUrl}/perfiles`, request);
  }

  /**
   * Actualiza el nombre de un perfil existente.
   * Consume PUT /perfiles/{id}
   */
  actualizar(id: number, request: PerfilRequest): Observable<ApiResponse<Perfil>> {
    return this.http.put<ApiResponse<Perfil>>(`${this.apiUrl}/perfiles/${id}`, request);
  }

  /**
   * Desactiva lógicamente un perfil.
   * Consume DELETE /perfiles/{id}
   */
  desactivar(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/perfiles/${id}`);
  }

  /**
   * Activa un perfil previamente desactivado.
   * Consume PATCH /perfiles/{id}/activar
   */
  activar(id: number): Observable<ApiResponse<void>> {
    return this.http.patch<ApiResponse<void>>(`${this.apiUrl}/perfiles/${id}/activar`, {});
  }

  /**
   * Obtiene los módulos autorizados para un perfil específico.
   * Consume GET /perfiles/{id}/modulos
   */
  obtenerModulosPorPerfil(idPerfil: number): Observable<PerfilPermisosResponse> {
    return this.http
      .get<ApiResponse<PerfilPermisosResponse>>(`${this.apiUrl}/perfiles/${idPerfil}/modulos`)
      .pipe(
        map((res) => {
          const data = getApiResponseData(res);
          if (!data) throw new Error('Información de permisos no encontrada');
          return data;
        }),
      );
  }

  /**
   * Actualiza la matriz de módulos autorizados asignados a un perfil.
   * Consume PUT /perfiles/{id}/permisos
   */
  actualizarPermisos(
    idPerfil: number,
    request: AsignarPermisosRequest,
  ): Observable<ApiResponse<void>> {
    return this.http.put<ApiResponse<void>>(`${this.apiUrl}/perfiles/${idPerfil}/permisos`, request);
  }
}
