import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse, getApiResponseData, ModuloResponse } from '../../../core/models';

@Service()
export class ModuloService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /**
   * Lista todos los módulos activos disponibles en el sistema ordenados.
   * Consume GET /modulos
   */
  listarActivos(): Observable<ModuloResponse[]> {
    return this.http
      .get<ApiResponse<ModuloResponse[]>>(`${this.apiUrl}/modulos`)
      .pipe(map((res) => getApiResponseData(res) ?? []));
  }
}
